// store/slices/notificationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../../../utils/apiClient";

// Fetch all notifications
export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get("/admin/notifications/all");
      
      let notificationsData = [];
      
      if (res.data?.data && Array.isArray(res.data.data)) {
        notificationsData = res.data.data;
      } else if (Array.isArray(res.data)) {
        notificationsData = res.data;
      }
      
      return notificationsData;
    } catch (err) {
      console.error("Fetch notifications error:", err);
      return rejectWithValue(err.response?.data || "Error");
    }
  },
);

// Fetch unread notifications
export const fetchUnreadNotifications = createAsyncThunk(
  "notifications/fetchUnreadNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get("/admin/notifications");
      
      let notificationsData = [];
      
      if (res.data?.data && Array.isArray(res.data.data)) {
        notificationsData = res.data.data;
      } else if (Array.isArray(res.data)) {
        notificationsData = res.data;
      }
      
      return notificationsData;
    } catch (err) {
      console.error("Fetch unread notifications error:", err);
      return rejectWithValue(err.response?.data || "Error");
    }
  },
);

// Fetch read notifications
export const fetchReadNotifications = createAsyncThunk(
  "notifications/fetchReadNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get("/admin/notifications/read");
      
      let notificationsData = [];
      
      if (res.data?.data && Array.isArray(res.data.data)) {
        notificationsData = res.data.data;
      } else if (Array.isArray(res.data)) {
        notificationsData = res.data;
      }
      
      return notificationsData;
    } catch (err) {
      console.error("Fetch read notifications error:", err);
      return rejectWithValue(err.response?.data || "Error");
    }
  },
);

// Fetch a single notification by ID
export const fetchNotificationById = createAsyncThunk(
  "notifications/fetchNotificationById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiClient.get(`/admin/notifications/${id}`);
      return res.data?.data || res.data;
    } catch (err) {
      console.error("Fetch notification detail error:", err);
      return rejectWithValue(err.response?.data || "Error");
    }
  },
);

// Mark a notification as read - REMOVE it from the list instead of just marking
export const markNotificationAsRead = createAsyncThunk(
  "notifications/markNotificationAsRead",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiClient.post(`/admin/notifications/${id}/mark-as-read`);
      return id; // Just return the ID to remove it from the list
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error");
    }
  },
);

// Mark all notifications as read - CLEAR the list
export const markAllNotificationsAsRead = createAsyncThunk(
  "notifications/markAllNotificationsAsRead",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.post("/admin/notifications/mark-all-as-read");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error");
    }
  },
);

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  selectedNotification: null,
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    // Remove a notification from the list
    removeNotification: (state, action) => {
      const id = action.payload;
      state.notifications = state.notifications.filter((n) => n.id !== id);
      state.unreadCount = state.notifications.length;
    },
    // Clear all notifications
    clearAllNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    clearSelectedNotification: (state) => {
      state.selectedNotification = null;
    },
    markAsRead: (state, action) => {
      const notification = state.notifications.find(
        (n) => n.id === action.payload,
      );
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount -= 1;
      }
    },
    markAllRead: (state) => {
      state.notifications.forEach((n) => (n.read = true));
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const rawNotifications = action.payload || [];
        
        state.notifications = rawNotifications.map((n) => {
          const notificationData = n.data || {};
          const notificationType = notificationData.type || 'general';
          
          let title = 'Notification';
          let message = notificationData.message || '';
          
          switch (notificationType) {
            case 'probation':
              title = 'Probation Alert';
              break;
            case 'leave':
              title = 'Leave Request';
              break;
            case 'attendance':
              title = 'Attendance Alert';
              break;
            case 'contract':
              title = 'Contract Alert';
              break;
            default:
              title = notificationData.title || notificationData.type || 'Notification';
          }
          
          if (!message && notificationData.employee) {
            message = `Notification for employee ${notificationData.employee}`;
          }
          
          const isRead = !!n.read_at;
          
          return {
            id: n.id,
            title: title,
            message: message,
            time: n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now',
            read: isRead,
            read_at: n.read_at || null,
            created_at: n.created_at,
            updated_at: n.updated_at,
            data: notificationData,
            type: n.type || notificationType,
            raw: n,
          };
        });
        
        state.unreadCount = state.notifications.filter((n) => !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        console.error("Fetch notifications rejected:", action.payload);
      })

      // Fetch unread notifications - REPLACE the list with unread ones
      .addCase(fetchUnreadNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUnreadNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const rawNotifications = action.payload || [];
        
        // Transform notifications
        const transformedNotifications = rawNotifications.map((n) => {
          const notificationData = n.data || {};
          const notificationType = notificationData.type || 'general';
          
          let title = 'Notification';
          let message = notificationData.message || '';
          
          switch (notificationType) {
            case 'probation':
              title = 'Probation Alert';
              break;
            case 'leave':
              title = 'Leave Request';
              break;
            case 'attendance':
              title = 'Attendance Alert';
              break;
            case 'contract':
              title = 'Contract Alert';
              break;
            default:
              title = notificationData.title || notificationData.type || 'Notification';
          }
          
          if (!message && notificationData.employee) {
            message = `Notification for employee ${notificationData.employee}`;
          }
          
          // All notifications from this endpoint are unread
          return {
            id: n.id,
            title: title,
            message: message,
            time: n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now',
            read: false,
            read_at: null,
            created_at: n.created_at,
            updated_at: n.updated_at,
            data: notificationData,
            type: n.type || notificationType,
            raw: n,
          };
        });
        
        state.notifications = transformedNotifications;
        state.unreadCount = transformedNotifications.length;
      })
      .addCase(fetchUnreadNotifications.rejected, (state, action) => {
        state.loading = false;
        console.error("Fetch unread notifications rejected:", action.payload);
      })

      // Fetch notification by ID
      .addCase(fetchNotificationById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotificationById.fulfilled, (state, action) => {
        state.loading = false;
        const rawNotification = action.payload;
        const notificationData = rawNotification.data || {};
        const notificationType = notificationData.type || 'general';
        
        let title = 'Notification';
        let message = notificationData.message || '';
        
        switch (notificationType) {
          case 'probation':
            title = 'Probation Alert';
            break;
          case 'leave':
            title = 'Leave Request';
            break;
          case 'attendance':
            title = 'Attendance Alert';
            break;
          case 'contract':
            title = 'Contract Alert';
            break;
          default:
            title = notificationData.title || notificationData.type || 'Notification';
        }
        
        if (!message && notificationData.employee) {
          message = `Notification for employee ${notificationData.employee}`;
        }
        
        const isRead = !!rawNotification.read_at;
        
        state.selectedNotification = {
          id: rawNotification.id,
          title: title,
          message: message,
          time: rawNotification.created_at ? new Date(rawNotification.created_at).toLocaleString() : 'Just now',
          read: isRead,
          read_at: rawNotification.read_at || null,
          created_at: rawNotification.created_at,
          updated_at: rawNotification.updated_at,
          data: notificationData,
          type: rawNotification.type || notificationType,
          raw: rawNotification,
        };
      })
      .addCase(fetchNotificationById.rejected, (state, action) => {
        state.loading = false;
        console.error("Fetch notification by ID rejected:", action.payload);
      })

      // Mark notification as read - REMOVE it from the list
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const id = action.payload;
        // Remove the notification from the list
        state.notifications = state.notifications.filter((n) => n.id !== id);
        state.unreadCount = state.notifications.length;
        
        // Also clear selected notification if it's the same
        if (state.selectedNotification?.id === id) {
          state.selectedNotification = null;
        }
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        console.error("Mark notification as read failed:", action.payload);
      })

      // Mark all notifications as read - CLEAR the list
      .addCase(markAllNotificationsAsRead.pending, (state) => {
        state.loading = true;
      })
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.loading = false;
        state.notifications = [];
        state.unreadCount = 0;
      })
      .addCase(markAllNotificationsAsRead.rejected, (state, action) => {
        state.loading = false;
        console.error("Mark all as read failed:", action.payload);
      });
  },
});

export const { 
  removeNotification,
  clearAllNotifications,
  clearSelectedNotification,
  markAsRead,
  markAllRead
} = notificationSlice.actions;
export default notificationSlice.reducer;