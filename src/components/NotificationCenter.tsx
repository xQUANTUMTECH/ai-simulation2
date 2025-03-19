import React, { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Clock } from 'lucide-react';
import { notificationService, Notification } from '../services/notification-service';
import { Modal } from './Modal';

interface NotificationCenterProps {
  isDarkMode: boolean;
}

export function NotificationCenter({ isDarkMode }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadNotifications();
    updateUnreadCount();

    // Subscribe to new notifications
    notificationService.subscribe('NotificationCenter', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      notificationService.unsubscribe('NotificationCenter');
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const notifications = await notificationService.getNotifications();
      setNotifications(notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const updateUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error getting unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );
      if (!notifications.find(n => n.id === notificationId)?.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowNotifications(true)}
        className="relative p-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <Modal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="Notifiche"
        isDarkMode={isDarkMode}
      >
        <div className="space-y-4">
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">
              {unreadCount} non lette
            </span>
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-3 py-1 text-sm rounded-lg hover:bg-gray-700 transition-colors"
            >
              <CheckCheck size={16} />
              Segna tutte come lette
            </button>
          </div>

          {/* Notifications List */}
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg ${
                  notification.read
                    ? isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                    : isDarkMode ? 'bg-gray-700' : 'bg-white'
                } transition-colors`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{notification.title}</h4>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-1 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Segna come letta"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="p-1 hover:bg-gray-600 rounded-lg transition-colors"
                      title="Elimina"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-2">
                  {notification.message}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock size={12} />
                  {new Date(notification.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}