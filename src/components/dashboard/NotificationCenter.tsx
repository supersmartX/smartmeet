"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Trash2, ExternalLink, Inbox } from "lucide-react";
import { Notification } from "@prisma/client";
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from "@/actions/notification";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    const result = await getNotifications();
    if (result.success && result.data) {
      setNotifications(result.data);
      setUnreadCount(result.data.filter(n => !n.read).length);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const result = await markNotificationAsRead(id);
    if (result.success) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsAsRead();
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const result = await deleteNotification(id);
    if (result.success) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      const wasUnread = notifications.find(n => n.id === id && !n.read);
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all relative group"
      >
        <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-via rounded-full border border-white dark:border-zinc-950" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/10 z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[500px]">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-brand-via hover:text-brand-via/80 transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500 text-xs">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-12 text-center flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">All caught up!</p>
                  <p className="text-[10px] text-zinc-500">No new notifications to show.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                    className={`px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer relative group ${!notification.read ? 'bg-brand-via/[0.02]' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                        notification.type === 'SUCCESS' ? 'bg-emerald-500' :
                        notification.type === 'ERROR' ? 'bg-rose-500' :
                        notification.type === 'WARNING' ? 'bg-amber-500' :
                        'bg-blue-500'
                      } ${notification.read ? 'opacity-20' : ''}`} />
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[11px] font-bold leading-none ${!notification.read ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>
                            {notification.title}
                          </p>
                          <span className="text-[9px] text-zinc-400 shrink-0">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className={`text-[10px] leading-relaxed ${!notification.read ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-500'}`}>
                          {notification.message}
                        </p>
                        
                        {notification.link && (
                          <Link 
                            href={notification.link}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-via hover:underline mt-1"
                            onClick={() => setIsOpen(false)}
                          >
                            View details
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>

                      <button 
                        onClick={(e) => handleDelete(e, notification.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <p className="text-[9px] text-center text-zinc-500">
                You have {unreadCount} unread notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
