import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface AdminNotificationsProps {
  isDarkMode: boolean;
}

export function AdminNotifications({ isDarkMode }: AdminNotificationsProps) {
  const notifications = [
    {
      id: 1,
      type: 'alert',
      title: 'System Alert',
      message: 'Storage usage approaching 85% capacity',
      time: '5 minutes ago',
      priority: 'high'
    },
    {
      id: 2,
      type: 'success',
      title: 'Backup Complete',
      message: 'Daily system backup completed successfully',
      time: '1 hour ago',
      priority: 'normal'
    },
    {
      id: 3,
      type: 'warning',
      title: 'Performance Notice',
      message: 'Increased latency detected in video processing',
      time: '2 hours ago',
      priority: 'medium'
    }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Notifiche di Sistema</h2>

      <div className="space-y-4">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } border ${
              notification.type === 'alert' ? 'border-red-500' :
              notification.type === 'warning' ? 'border-yellow-500' :
              'border-green-500'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'alert' && (
                <AlertTriangle className="text-red-500" size={24} />
              )}
              {notification.type === 'warning' && (
                <AlertTriangle className="text-yellow-500" size={24} />
              )}
              {notification.type === 'success' && (
                <CheckCircle2 className="text-green-500" size={24} />
              )}
              <div className="flex-1">
                <h3 className="font-medium">{notification.title}</h3>
                <p className="text-gray-400">{notification.message}</p>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Clock size={16} />
                <span className="text-sm">{notification.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}