// 活动日志（收件箱）：内存状态 + 按用户隔离的 localStorage 持久化
import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { BackendUser } from '../api';
import type { Activity, PageData } from '../types';
import { STORAGE_KEYS, loadJSON, saveJSON, removeKey } from '../lib/storage';

export function useActivities(user: BackendUser | null) {
  const [activities, setActivities] = useState<Activity[]>([]);

  // 活动日志按用户隔离存储，访客使用固定 key；旧的全局单 key 直接弃用
  const activitiesKey = STORAGE_KEYS.activities(user?.id);
  const skipActivitiesPersistRef = useRef(true);

  // 登录/登出切换：加载当前账号对应的活动日志
  useEffect(() => {
    // 标记跳过切换后的第一次持久化，避免把上一账号内存中的活动写入新 key
    skipActivitiesPersistRef.current = true;
    setActivities(loadJSON<Activity[]>(activitiesKey, []));
    // 旧版本全局单 key 的数据不做迁移，直接清除
    removeKey('molink-activities');
  }, [activitiesKey]);

  // 活动日志持久化到 localStorage
  useEffect(() => {
    if (skipActivitiesPersistRef.current) {
      skipActivitiesPersistRef.current = false;
      return;
    }
    saveJSON(activitiesKey, activities);
  }, [activities, activitiesKey]);

  // 合并同一页面短时间内的连续编辑（30 秒窗口）
  const addActivity = useCallback((type: Activity['type'], page: PageData, preview?: string) => {
    const userName = user?.full_name || user?.email.split('@')[0] || '访客';
    const now = new Date().toISOString();
    const MERGE_WINDOW_MS = 30_000; // 30 秒

    setActivities(prev => {
      // icon-change 不受合并机制影响
      const shouldMerge = type !== 'icon-change';

      if (shouldMerge) {
        // 查找同一页面、同一类型、同一用户、30 秒内的已有活动
        const existingIdx = prev.findIndex(a =>
          a.type === type &&
          a.pageId === page.id &&
          a.userName === userName &&
          (new Date(now).getTime() - new Date(a.timestamp).getTime()) < MERGE_WINDOW_MS
        );

        if (existingIdx !== -1) {
          // 合并：更新 timestamp 和 preview
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            pageTitle: page.title || '无标题',
            pageIcon: page.icon,
            preview: preview !== undefined ? preview : updated[existingIdx].preview,
            timestamp: now,
          };
          // 将更新后的活动移到最前面
          const [moved] = updated.splice(existingIdx, 1);
          return [moved, ...updated];
        }
      }

      // 新建活动
      const activity: Activity = {
        id: uuidv4(),
        type,
        userName,
        userInitial: userName.charAt(0).toUpperCase(),
        pageId: page.id,
        pageTitle: page.title || '无标题',
        pageIcon: page.icon,
        preview,
        timestamp: now,
      };
      return [activity, ...prev];
    });
  }, [user]);

  // 图标变更单独成条（记录新旧图标，不参与 30 秒合并）
  const recordIconChange = useCallback((page: PageData, oldIcon?: string, newIcon?: string) => {
    const userName = user?.full_name || user?.email.split('@')[0] || '访客';
    const activity: Activity = {
      id: uuidv4(),
      type: 'icon-change',
      userName,
      userInitial: userName.charAt(0).toUpperCase(),
      pageId: page.id,
      pageTitle: page.title || '无标题',
      pageIcon: page.icon,
      oldIcon,
      newIcon,
      timestamp: new Date().toISOString(),
    };
    setActivities(prev => [activity, ...prev]);
  }, [user]);

  return { activities, addActivity, recordIconChange };
}
