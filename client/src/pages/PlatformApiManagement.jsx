import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Badge, Spinner, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PlatformIcon from '../components/platforms/PlatformIcon';
import Navbar from '../components/Navbar';
import platformService from '../services/platformService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from '../components/common/ErrorBoundary';
import './PlatformApiManagement.css';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaSyncAlt } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import WhatsAppConnectModal from '../components/platforms/WhatsAppConnectModal';

const platformList = [
  { 
    key: 'whatsapp', 
    name: 'WhatsApp',
    description: 'Connect your WhatsApp Business account to enable automated responses and notifications.',
    category: 'messaging'
  },
  { 
    key: 'messenger', 
    name: 'Messenger',
    description: 'Integrate with Facebook Messenger to engage with your audience through automated chats.',
    category: 'messaging'
  },
  { 
    key: 'shopee', 
    name: 'Shopee',
    description: 'Connect your Shopee seller account to manage orders and automate customer interactions.',
    category: 'ecommerce'
  },
  { 
    key: 'lazada', 
    name: 'Lazada',
    description: 'Link your Lazada seller account for automated order management and customer service.',
    category: 'ecommerce'
  },
  { 
    key: 'telegram', 
    name: 'Telegram',
    description: 'Integrate with Telegram to enable automated messaging and customer support via bots.',
    category: 'messaging'
  },
  { 
    key: 'gmail', 
    name: 'Gmail',
    description: 'Connect your Gmail account to send automated emails and manage customer correspondence.',
    category: 'email'
  },
  { 
    key: 'facebook', 
    name: 'Facebook',
    description: 'Link your Facebook page to automate posts, comments, and manage social media presence.',
    category: 'social'
  },
  { 
    key: 'instagram', 
    name: 'Instagram',
    description: 'Connect your Instagram account to schedule posts and engage with your audience.',
    category: 'social'
  },
  { 
    key: 'xiaohongshu', 
    name: 'Xiaohongshu',
    description: 'Integrate with Xiaohongshu to manage your content and automate responses.',
    category: 'social'
  },
];

const categories = [
  { key: 'all', name: 'All Platforms' },
  { key: 'messaging', name: 'Messaging Platforms' },
  { key: 'ecommerce', name: 'E-commerce Platforms' },
  { key: 'social', name: 'Social Media' },
  { key: 'email', name: 'Email Services' }
];

export default function PlatformApiManagement() {
  const [authStatus, setAuthStatus] = useState({});
  const [accountInfo, setAccountInfo] = useState({});
  const [loadingKey, setLoadingKey] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isBackendMocked, setIsBackendMocked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // State for WhatsApp Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppConnectError, setWhatsAppConnectError] = useState(null);
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false);

  // Fetch platform statuses and account info
  const fetchPlatformData = async () => {
    setError(null);
    setInitialLoading(true);
    try {
      const statuses = await platformService.getPlatformStatus();
      setAuthStatus(statuses);
      setIsBackendMocked(statuses._isMockData === true);
      const authorized = Object.entries(statuses).filter(([key, isAuth]) => isAuth && key !== '_isMockData');
      const infoPromises = authorized.map(async ([key]) => {
        try {
          const info = await platformService.getPlatformAccountInfo(key);
          return [key, info];
        } catch (err) {
          console.error(`Failed to load account info for ${key.charAt(0).toUpperCase() + key.slice(1)}`, err);
          toast.warning(`Failed to load account info for ${key.charAt(0).toUpperCase() + key.slice(1)}`, { autoClose: 3000 });
          return [key, null];
        }
      });
      const infoResults = await Promise.all(infoPromises);
      const infoMap = Object.fromEntries(infoResults.filter(([, info]) => info != null));
      setAccountInfo(infoMap);
    } catch (err) {
      const errMsg = err.message || 'Unknown error occurred';
      console.error('Error occurred while fetching platform statuses:', err);
      setError(`Error occurred while fetching platform statuses: ${errMsg}`);
      toast.error('Failed to load platform statuses, please try again');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  // Handle OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get('success');
    const platformKey = params.get('platform');
    if (success === 'true' && platformKey) {
      toast.success(`Successfully authorized ${platformKey.charAt(0).toUpperCase() + platformKey.slice(1)}`);
      fetchPlatformData();
      navigate('/dashboard/platform-api', { replace: true });
    }
  }, [location.search, navigate]);

  // Authorization operations
  const handleAuth = async (key) => {
    // OAuth platform list - including 'shopee' and 'lazada'
    const oauthPlatforms = ['facebook', 'instagram', 'messenger', 'gmail', 'shopee', 'lazada'];
    
    // Check if the platform uses OAuth
    if (oauthPlatforms.includes(key)) {
      setLoadingKey(key);
      try {
        console.log(`Fetching ${key.charAt(0).toUpperCase() + key.slice(1)} authorization URL`);
        const result = await platformService.getPlatformAuthUrl(key);
        let authUrl;

        // Parse response and extract authorization URL
        if (typeof result === 'string') {
          // Response is a string URL (e.g., Facebook mock URL)
          authUrl = result;
        } else if (result && typeof result === 'object' && result.authUrl) {
          // Response object contains authUrl property (e.g., Instagram, Gmail)
          authUrl = result.authUrl; 
        } else if (result && typeof result === 'object' && result.url) {
          // Response object contains url property (generic case)
          authUrl = result.url; 
        } else {
          // Handle invalid response formats
          console.error(`Failed to get ${key.charAt(0).toUpperCase() + key.slice(1)} authorization URL: invalid response format`, result);
          toast.error(`Failed to get ${key.charAt(0).toUpperCase() + key.slice(1)} authorization link: invalid response format`);
          setLoadingKey(null);
          return;
        }

        // Validate extracted URL
        if (authUrl) {
          console.log(`Received valid authorization URL for ${key.charAt(0).toUpperCase() + key.slice(1)}: ${authUrl}`);
          // Redirect user to authorization page
          window.location.href = authUrl;
        } else {
          console.error(`Failed to get ${key.charAt(0).toUpperCase() + key.slice(1)} authorization URL: URL is empty or invalid`);
          toast.error(`Failed to get ${key.charAt(0).toUpperCase() + key.slice(1)} authorization link: no valid URL retrieved`);
          setLoadingKey(null);
        }

      } catch (err) {
        console.error(`Error fetching ${key.charAt(0).toUpperCase() + key.slice(1)} authorization URL:`, err);
        const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
        toast.error(`Failed to get ${key.charAt(0).toUpperCase() + key.slice(1)} authorization link: ${errorMessage}`);
        setLoadingKey(null);
      } 
      // No need for finally to reset loadingKey, it is handled in error cases and before redirect
      return;
    }
    
    // 非 OAuth 平台的处理逻辑
    setLoadingKey(key);
    try {
      const result = await platformService.authorizePlatform(key);
      setAuthStatus(prev => ({ ...prev, [key]: true }));
      setAccountInfo(prev => ({ ...prev, [key]: result.accountInfo }));
      toast.success(`Successfully authorized ${key.charAt(0).toUpperCase() + key.slice(1)}`);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      console.error(`Authorization failed for ${key}:`, error);
      toast.error(`Failed to get ${key.charAt(0).toUpperCase() + key.slice(1)} authorization link: ${errorMessage}`);
    } finally {
      setLoadingKey(null);
    }
  };

  // 解绑操作
  const handleUnbind = async (key) => {
    setLoadingKey(key);
    try {
      await platformService.unbindPlatform(key);
      setAuthStatus(prev => ({ ...prev, [key]: false }));
      setAccountInfo(prev => {
        const newInfo = { ...prev };
        delete newInfo[key];
        return newInfo;
      });
      toast.success(`Successfully unbound ${key.charAt(0).toUpperCase() + key.slice(1)}`);
    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error(`Unbind failed for ${key}:`, error);
      toast.error(`Failed to unbind ${key.charAt(0).toUpperCase() + key.slice(1)}: ${errorMessage}`);
    } finally {
      setLoadingKey(null);
    }
  };

  // 重试加载
  const retryLoading = () => {
    setInitialLoading(true);
    setError(null);
    // 触发重新获取数据而不是刷新整个页面
    const fetchPlatformStatus = async () => {
      try {
        const statuses = await platformService.getPlatformStatus();
        setAuthStatus(statuses);
        
        // 检测是否使用的是模拟数据
        setIsBackendMocked(statuses.hasOwnProperty('_isMockData') && statuses._isMockData === true);
        
        // 获取已授权平台的账号信息
        const authorizedPlatforms = Object.entries(statuses)
          .filter(([key, isAuthorized]) => isAuthorized && key !== '_isMockData');
        
        if (authorizedPlatforms.length > 0) {
          const infoPromises = authorizedPlatforms.map(async ([key]) => {
            try {
              const info = await platformService.getPlatformAccountInfo(key);
              return [key, info];
            } catch (error) {
              return [key, null];
            }
          });
          
          const infoResults = await Promise.all(infoPromises);
          const infoMap = Object.fromEntries(infoResults.filter(([, info]) => info !== null));
          setAccountInfo(infoMap);
        }
        
        toast.success('平台状态已刷新');
      } catch (error) {
        const errorMessage = error.message || 'Unknown error occurred';
        setError(`Error occurred while fetching platform statuses: ${errorMessage}`);
        toast.error('Failed to load platform statuses, please try again');
      } finally {
        setInitialLoading(false);
      }
    };
    
    fetchPlatformStatus();
  };

  // 过滤平台
  const filteredPlatforms = platformList.filter(platform => {
    return activeCategory === 'all' || platform.category === activeCategory;
  });

  // 授权平台计数
  const authorizedCount = Object.entries(authStatus)
    .filter(([key, value]) => key !== '_isMockData' && value)
    .length;

  // --- WhatsApp Connection Handling --- 
  const handleWhatsAppConnectClick = () => {
    setWhatsAppConnectError(null); // Clear previous errors
    setShowWhatsAppModal(true);
  };

  const handleWhatsAppClose = () => {
    if (!isConnectingWhatsApp) { // Prevent closing while connecting
       setShowWhatsAppModal(false);
       setWhatsAppConnectError(null);
    }
  };

  const handleWhatsAppSubmit = async (credentials) => {
    console.log('WhatsApp Credentials Submitted:', credentials);
    setIsConnectingWhatsApp(true);
    setWhatsAppConnectError(null);
    setLoadingKey('whatsapp'); // Indicate loading specifically for WhatsApp card

    try {
      // 调用真实的 service 函数
      const accountInfoResult = await platformService.connectWhatsApp(credentials);
      
      // 使用从后端返回的真实数据更新状态
      setAuthStatus(prev => ({ ...prev, whatsapp: true }));
      // 假设 accountInfoResult 包含 name 和 connectedAt (后端在 metadata 或直接返回)
      // 如果后端返回结构不同，需要相应调整
      setAccountInfo(prev => ({ 
        ...prev, 
        whatsapp: { 
          name: accountInfoResult.accountName || `WhatsApp (${accountInfoResult.accountId})`, 
          connectedAt: accountInfoResult.metadata?.connectedAt || new Date().toISOString() // Adjust based on backend response structure
        }
      }));
      toast.success('成功连接 WhatsApp');
      setShowWhatsAppModal(false); // Close modal on success
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || '连接 WhatsApp 失败';
      console.error('WhatsApp connection failed:', error);
      setWhatsAppConnectError(errorMessage); // Show error inside the modal
      toast.error(`连接 WhatsApp 失败: ${errorMessage}`);
      // Keep the modal open on error so the user can see the error message
    } finally {
      setIsConnectingWhatsApp(false);
      setLoadingKey(null);
    }
  };
  // --- End WhatsApp Connection Handling --- 

  // 加载状态
  if (initialLoading) {
    return (
      <>
        <Navbar />
        <div className="container d-flex flex-column justify-content-center align-items-center" style={{ paddingTop: 120, height: '70vh' }}>
          <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3 text-center">加载平台状态中...</p>
        </div>
      </>
    );
  }

  // 错误状态
  if (error) {
    return (
      <>
        <Navbar />
        <div className="container" style={{ paddingTop: 80 }}>
          <Alert variant="danger">
            <Alert.Heading>加载数据时出错</Alert.Heading>
            <p>{error}</p>
            <hr />
            <div className="d-flex justify-content-end">
              <Button onClick={retryLoading} variant="outline-danger">
                <FaSyncAlt className="me-2" />
                重试
              </Button>
            </div>
          </Alert>
        </div>
      </>
    );
  }

  // 主内容
  return (
    <>
      <Navbar />
      <ErrorBoundary>
        <div className="container platform-api-container">
          <header className="platform-api-header">
            <h2>平台 API 管理</h2>
            <p className="text-muted">
              连接并管理您在各平台上的账户。授权账户将被AI代理用于自动回复和内容发布。
            </p>
            {isBackendMocked && (
              <Alert variant="warning" className="mt-3 mx-auto" style={{ maxWidth: 600 }}>
                <FaExclamationTriangle className="me-2" />
                <strong>开发模式</strong>: 当前显示的是模拟数据，API后端尚未完全实现。
              </Alert>
            )}
          </header>
          
          <div className="platform-dashboard mb-4">
            <div className="d-flex align-items-center mb-3">
              <div className="platform-stats">
                <div className="platform-stat-card">
                  <div className="stat-info">
                    <span className="stat-value">{authorizedCount}</span>
                    <span className="stat-label">已连接平台</span>
                  </div>
                  <div className="stat-info">
                    <span className="stat-value">{platformList.length - authorizedCount}</span>
                    <span className="stat-label">待连接平台</span>
                  </div>
                </div>
              </div>
              
              <div className="ms-auto">
                <Button 
                  variant="outline-primary" 
                  className="refresh-button"
                  onClick={retryLoading}
                  disabled={initialLoading}
                >
                  <FaSyncAlt className={initialLoading ? 'icon-spin' : ''} />
                  <span className="ms-1 d-none d-md-inline">刷新</span>
                </Button>
              </div>
            </div>
            
            <div className="category-filters mt-3">
              <div className="d-flex flex-wrap">
                {categories.map(category => (
                  <Button 
                    key={category.key}
                    variant={activeCategory === category.key ? "primary" : "outline-secondary"}
                    className="me-2 mb-2"
                    onClick={() => setActiveCategory(category.key)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {filteredPlatforms.length === 0 ? (
            <Alert variant="info">
              没有找到匹配的平台。请尝试不同的筛选条件。
            </Alert>
          ) : (
            <Row xs={1} sm={1} md={2} lg={3} className="g-4">
              {filteredPlatforms.map(({ key, name, description }) => (
                <Col key={key}>
                  <Card className={`platform-card ${authStatus[key] ? 'authorized' : 'unauthorized'}`}>
                    <Card.Body>
                      {/* 标题与状态 */}
                      <div className="platform-card-header">
                        <div className="platform-icon-container">
                          <PlatformIcon platform={key} size={32} />
                        </div>
                        <div className="platform-title">
                          <Card.Title>{name}</Card.Title>
                          <Badge bg={authStatus[key] ? 'success' : 'secondary'} className="status-badge">
                            {authStatus[key] ? '已授权' : '未授权'}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* 平台描述 */}
                      <Card.Text className="platform-description">
                        {description}
                      </Card.Text>
                      
                      {/* 账号信息 */}
                      {authStatus[key] && accountInfo[key] && (
                        <div className="account-info">
                          <div className="account-name">
                            <strong>账户:</strong> {accountInfo[key].name}
                          </div>
                          <div className="account-date">
                            <strong>连接时间:</strong> {new Date(accountInfo[key].connectedAt).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                      
                      {/* 操作按钮 */}
                      <div className="platform-actions">
                        {authStatus[key] ? (
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>移除与{name}的连接</Tooltip>}
                          >
                            <Button
                              variant="outline-danger"
                              className="action-button"
                              disabled={loadingKey === key}
                              onClick={() => handleUnbind(key)}
                            >
                              {loadingKey === key ? (
                                <>
                                  <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                  />
                                  <span className="ms-1">Unbinding...</span>
                                </>
                              ) : (
                                <>
                                  <FaTimesCircle className="me-1" />
                                  解除绑定
                                </>
                              )}
                            </Button>
                          </OverlayTrigger>
                        ) : (
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>连接到您的{name}账户</Tooltip>}
                          >
                            <Button
                              variant="primary"
                              className="action-button"
                              disabled={loadingKey === key || (isConnectingWhatsApp && key === 'whatsapp')}
                              onClick={key === 'whatsapp' 
                                ? handleWhatsAppConnectClick // If WhatsApp, call the modal handler
                                : () => handleAuth(key)     // Otherwise, call the original handleAuth
                              }
                            >
                              {(loadingKey === key || (isConnectingWhatsApp && key === 'whatsapp')) ? (
                                <>
                                  <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-1"
                                  />
                                  <span className="ms-1">{key === 'whatsapp' ? '连接中...' : '授权中...'}</span>
                                </> 
                              ) : (
                                <>
                                  <FaCheckCircle className="me-1" />
                                  授权连接
                                </> 
                              )}
                            </Button>
                          </OverlayTrigger>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </ErrorBoundary>
      <ToastContainer position="bottom-right" />

      {/* Render the WhatsApp Modal */}
      <WhatsAppConnectModal 
        show={showWhatsAppModal} 
        onHide={handleWhatsAppClose} 
        onSubmit={handleWhatsAppSubmit} 
        isConnecting={isConnectingWhatsApp}
        error={whatsAppConnectError}
      />
    </>
  );
} 