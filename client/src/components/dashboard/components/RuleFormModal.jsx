import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import api from '../../../api/axiosInstance';

export default function RuleFormModal({ show, mode, ruleData, onSave, onDelete, onHide }) {
  const [name, setName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [responseText, setResponseText] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && ruleData) {
      setName(ruleData.name || '');
      setKeyword(ruleData.keyword || '');
      setResponseText(ruleData.response || '');
      setIsRegex(!!ruleData.is_regex);
    } else {
      setName('');
      setKeyword('');
      setResponseText('');
      setIsRegex(false);
    }
  }, [mode, ruleData]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = { name, keyword, response: responseText, is_regex: isRegex };
      let result;
      if (mode === 'edit') {
        result = await api.put(`/auto-reply/rules/${ruleData.id}`, payload);
      } else {
        result = await api.post('/auto-reply/rules', payload);
      }
      onSave(result.data);
      onHide();
    } catch (err) {
      console.error('Rule save error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!ruleData) return;
    if (!window.confirm('确认删除此规则？')) return;
    setLoading(true);
    try {
      await api.delete(`/auto-reply/rules/${ruleData.id}`);
      onDelete(ruleData);
      onHide();
    } catch (err) {
      console.error('Rule delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{mode === 'edit' ? '编辑规则' : '新建规则'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3" controlId="ruleName">
            <Form.Label>规则名称</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="自定义规则名称"
              disabled={loading}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="ruleKeyword">
            <Form.Label>关键词/模式</Form.Label>
            <Form.Control
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="匹配文本或正则"
              disabled={loading}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="ruleIsRegex">
            <Form.Check
              type="checkbox"
              label="正则表达式"
              checked={isRegex}
              onChange={e => setIsRegex(e.target.checked)}
              disabled={loading}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="ruleResponse">
            <Form.Label>回复内容</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              placeholder="自动回复内容"
              disabled={loading}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        {mode === 'edit' && (
          <Button variant="danger" onClick={handleDelete} disabled={loading}>
            删除
          </Button>
        )}
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          取消
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={loading}>
          {mode === 'edit' ? '保存' : '创建'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
} 