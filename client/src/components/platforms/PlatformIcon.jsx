import React from 'react';
import { 
  FaWhatsapp, 
  FaFacebookMessenger, 
  FaShopify, 
  FaTelegram,
  FaEnvelope,
  FaFacebook,
  FaInstagram,
  FaShoppingCart
} from 'react-icons/fa';
import { SiXiaohongshu } from 'react-icons/si';

const ICON_SIZE = 24;

const PlatformIcon = ({ platform, size = ICON_SIZE }) => {
  switch (platform) {
    case 'whatsapp':
      return <FaWhatsapp size={size} color="#25D366" />;
    case 'messenger':
      return <FaFacebookMessenger size={size} color="#00B2FF" />;
    case 'shopee':
      return <FaShopify size={size} color="#EE4D2D" />;
    case 'lazada':
      return <FaShoppingCart size={size} color="#F27E0A" />;
    case 'telegram':
      return <FaTelegram size={size} color="#0088CC" />;
    case 'gmail':
      return <FaEnvelope size={size} color="#D44638" />;
    case 'facebook':
      return <FaFacebook size={size} color="#1877F2" />;
    case 'instagram':
      return <FaInstagram size={size} color="#E1306C" />;
    case 'xiaohongshu':
      return <SiXiaohongshu size={size} color="#FE2C55" />;
    default:
      return null;
  }
};

export default PlatformIcon; 