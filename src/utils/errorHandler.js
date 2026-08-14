// Centralized error handler service
class ErrorHandler {
  constructor() {
    this.errorTypes = {
      // Database constraint errors
      FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',
      UNIQUE_VIOLATION: 'UNIQUE_VIOLATION',
      NOT_NULL_VIOLATION: 'NOT_NULL_VIOLATION',
      
      // Network errors
      NETWORK_ERROR: 'NETWORK_ERROR',
      TIMEOUT_ERROR: 'TIMEOUT_ERROR',
      
      // Authentication errors
      UNAUTHORIZED: 'UNAUTHORIZED',
      FORBIDDEN: 'FORBIDDEN',
      SESSION_EXPIRED: 'SESSION_EXPIRED',
      
      // Validation errors
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      INVALID_INPUT: 'INVALID_INPUT',
      
      // Business logic errors
      ALREADY_PUNCHED_IN: 'ALREADY_PUNCHED_IN',
      ALREADY_PUNCHED_OUT: 'ALREADY_PUNCHED_OUT',
      OUTSIDE_WORKING_HOURS: 'OUTSIDE_WORKING_HOURS',
      LOCATION_NOT_ALLOWED: 'LOCATION_NOT_ALLOWED',
      PENDING_PUNCH_OUT: 'PENDING_PUNCH_OUT',
      LATE_PUNCH_PENDING_APPROVAL: 'LATE_PUNCH_PENDING_APPROVAL',
      
      // Server errors
      SERVER_ERROR: 'SERVER_ERROR',
      SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
      
      // Generic
      UNKNOWN_ERROR: 'UNKNOWN_ERROR'
    };

    this.errorMessages = {
      [this.errorTypes.FOREIGN_KEY_VIOLATION]: {
        title: 'Account Configuration Issue',
        message: 'Your account is missing required information. Please contact HR to complete your profile.',
        action: 'Contact HR',
        actionType: 'contact'
      },
      [this.errorTypes.UNIQUE_VIOLATION]: {
        title: 'Duplicate Entry',
        message: 'This record already exists in the system.',
        action: 'Try Again',
        actionType: 'retry'
      },
      [this.errorTypes.NETWORK_ERROR]: {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        action: 'Retry',
        actionType: 'retry'
      },
      [this.errorTypes.TIMEOUT_ERROR]: {
        title: 'Request Timeout',
        message: 'The server is taking too long to respond. Please try again.',
        action: 'Retry',
        actionType: 'retry'
      },
      [this.errorTypes.UNAUTHORIZED]: {
        title: 'Authentication Required',
        message: 'Please log in again to continue.',
        action: 'Login',
        actionType: 'login'
      },
      [this.errorTypes.FORBIDDEN]: {
        title: 'Access Denied',
        message: 'You don\'t have permission to perform this action.',
        action: 'Contact Admin',
        actionType: 'contact'
      },
      [this.errorTypes.SESSION_EXPIRED]: {
        title: 'Session Expired',
        message: 'Your session has expired. Please log in again.',
        action: 'Login',
        actionType: 'login'
      },
      [this.errorTypes.VALIDATION_ERROR]: {
        title: 'Validation Error',
        message: 'Please check the form for errors and try again.',
        action: 'Fix Errors',
        actionType: 'fix'
      },
      [this.errorTypes.ALREADY_PUNCHED_IN]: {
        title: 'Already Punched In',
        message: 'You have already punched in for today.',
        action: 'Punch Out',
        actionType: 'punch_out'
      },
      [this.errorTypes.ALREADY_PUNCHED_OUT]: {
        title: 'Already Punched Out',
        message: 'You have already punched out for today.',
        action: 'Contact HR',
        actionType: 'contact'
      },
      [this.errorTypes.OUTSIDE_WORKING_HOURS]: {
        title: 'Outside Working Hours',
        message: 'Punch in/out is only allowed during working hours.',
        action: 'Check Schedule',
        actionType: 'schedule'
      },
      [this.errorTypes.LOCATION_NOT_ALLOWED]: {
        title: 'Location Not Allowed',
        message: 'Your current location is not within the allowed area.',
        action: 'Try Again',
        actionType: 'retry'
      },
      [this.errorTypes.PENDING_PUNCH_OUT]: {
        title: 'Pending Punch Out',
        message: 'You have a pending punch out from a previous day. Please complete it first.',
        action: 'Punch Out Now',
        actionType: 'punch_out'
      },
      [this.errorTypes.LATE_PUNCH_PENDING_APPROVAL]: {
        title: 'Late Punch In - Pending Approval',
        message: 'Your late punch-in request is pending HR approval. Please wait.',
        action: 'Okay, I\'ll Wait',
        actionType: 'wait'
      },
      [this.errorTypes.SERVER_ERROR]: {
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        action: 'Try Again',
        actionType: 'retry'
      },
      [this.errorTypes.SERVICE_UNAVAILABLE]: {
        title: 'Service Unavailable',
        message: 'The service is temporarily unavailable. Please try again later.',
        action: 'Retry',
        actionType: 'retry'
      },
      [this.errorTypes.UNKNOWN_ERROR]: {
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred. Please try again.',
        action: 'Try Again',
        actionType: 'retry'
      }
    };
  }

  // Extract error message from various formats
  extractErrorMessage(error) {
    console.log('Extracting message from:', error);

    // If error is a string
    if (typeof error === 'string') {
      return error;
    }

    // If error has payload (Redux thunk rejection)
    if (error?.payload) {
      const payload = error.payload;
      if (typeof payload === 'string') return payload;
      if (payload?.message) return payload.message;
      if (payload?.data?.message) return payload.data.message;
      if (payload?.error) return typeof payload.error === 'string' ? payload.error : payload.error?.message;
      if (payload?.msg) return payload.msg;
      if (payload?.detail) return payload.detail;
    }

    // If error has response data (Axios error)
    if (error?.response?.data) {
      const data = error.response.data;
      if (typeof data === 'string') return data;
      if (data?.message) return data.message;
      if (data?.error) return typeof data.error === 'string' ? data.error : data.error?.message;
      if (data?.msg) return data.msg;
      if (data?.detail) return data.detail;
      if (data?.data?.message) return data.data.message;
    }

    // If error has data property
    if (error?.data) {
      if (typeof error.data === 'string') return error.data;
      if (error.data?.message) return error.data.message;
      if (error.data?.error) return error.data.error;
    }

    // If error has message property
    if (error?.message) {
      return error.message;
    }

    // If error has error property
    if (error?.error) {
      if (typeof error.error === 'string') return error.error;
      if (error.error?.message) return error.error.message;
      if (error.error?.response?.data?.message) return error.error.response.data.message;
    }

    // Check for nested error structures
    if (error?.error?.response?.data?.message) {
      return error.error.response.data.message;
    }

    // If error is an object, try to stringify it
    if (typeof error === 'object' && error !== null) {
      try {
        const jsonStr = JSON.stringify(error);
        if (jsonStr && jsonStr !== '{}') {
          const parsed = JSON.parse(jsonStr);
          if (parsed?.message) return parsed.message;
          if (parsed?.error) return typeof parsed.error === 'string' ? parsed.error : parsed.error?.message;
        }
        return jsonStr;
      } catch (e) {
        return String(error);
      }
    }

    return null;
  }

  // Parse error and determine type
  parseError(error) {
    // Extract the error message
    const errorMessage = this.extractErrorMessage(error) || '';
    console.log('Extracted message:', errorMessage);

    const statusCode = error?.response?.status || error?.status || error?.payload?.status || null;
    const errorData = error?.response?.data || error?.data || error?.payload || {};

    // Check for specific SQL errors
    if (errorMessage.includes('foreign key constraint fails') || 
        errorMessage.includes('1452')) {
      return this.errorTypes.FOREIGN_KEY_VIOLATION;
    }
    
    if (errorMessage.includes('Duplicate entry') || 
        errorMessage.includes('1062')) {
      return this.errorTypes.UNIQUE_VIOLATION;
    }
    
    if (errorMessage.includes('cannot be null') || 
        errorMessage.includes('1048')) {
      return this.errorTypes.NOT_NULL_VIOLATION;
    }

    // Check for pending punch-out error
    if (errorMessage.includes('pending punch-out') || 
        errorMessage.includes('punch out for that day') ||
        errorMessage.includes('Please punch out first') ||
        errorMessage.includes('You have pending punch out')) {
      return this.errorTypes.PENDING_PUNCH_OUT;
    }

    // Check for late punch-in with HR approval
    if (errorMessage.includes('Punch-in blocked') || 
        errorMessage.includes('pending HR approval') ||
        errorMessage.includes('late check-in request') ||
        errorMessage.includes('late check-in is pending') ||
        errorMessage.includes('late check-in request is pending')) {
      return this.errorTypes.LATE_PUNCH_PENDING_APPROVAL;
    }

    // Check status codes
    if (statusCode === 401) {
      return this.errorTypes.UNAUTHORIZED;
    }
    
    if (statusCode === 403) {
      return this.errorTypes.FORBIDDEN;
    }
    
    if (statusCode === 422) {
      return this.errorTypes.VALIDATION_ERROR;
    }
    
    if (statusCode === 500) {
      return this.errorTypes.SERVER_ERROR;
    }
    
    if (statusCode === 503) {
      return this.errorTypes.SERVICE_UNAVAILABLE;
    }

    // Check network errors
    if (errorMessage.includes('Network Error') || 
        errorMessage.includes('Failed to fetch')) {
      return this.errorTypes.NETWORK_ERROR;
    }
    
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('Timeout')) {
      return this.errorTypes.TIMEOUT_ERROR;
    }

    // Check business logic errors
    if (errorMessage.toLowerCase().includes('already punched in')) {
      return this.errorTypes.ALREADY_PUNCHED_IN;
    }
    
    if (errorMessage.toLowerCase().includes('already punched out')) {
      return this.errorTypes.ALREADY_PUNCHED_OUT;
    }
    
    if (errorMessage.toLowerCase().includes('outside working hours')) {
      return this.errorTypes.OUTSIDE_WORKING_HOURS;
    }
    
    if (errorMessage.toLowerCase().includes('location')) {
      return this.errorTypes.LOCATION_NOT_ALLOWED;
    }

    return this.errorTypes.UNKNOWN_ERROR;
  }

  // Get user-friendly error object
  getFriendlyError(error) {
    const errorType = this.parseError(error);
    console.log('Error type determined:', errorType);
    
    let defaultError = this.errorMessages[errorType];
    
    // If we have a specific error type and it has a dynamic message, use the actual message
    if (errorType === this.errorTypes.LATE_PUNCH_PENDING_APPROVAL) {
      const actualMessage = this.extractErrorMessage(error);
      if (actualMessage && actualMessage.includes('Punch-in blocked')) {
        defaultError = {
          ...defaultError,
          message: actualMessage
        };
      }
    }

    if (errorType === this.errorTypes.PENDING_PUNCH_OUT) {
      const actualMessage = this.extractErrorMessage(error);
      if (actualMessage) {
        defaultError = {
          ...defaultError,
          message: actualMessage
        };
      }
    }
    
    // Extract validation errors if present
    const validationErrors = error?.response?.data?.errors || error?.data?.errors || error?.payload?.errors;
    if (validationErrors && errorType === this.errorTypes.VALIDATION_ERROR) {
      const fieldErrors = Object.values(validationErrors).flat();
      return {
        title: 'Validation Failed',
        message: fieldErrors.join(', '),
        action: 'Fix Errors',
        actionType: 'fix',
        details: validationErrors
      };
    }

    // If we have a custom message and it's not a known type, use the custom message
    if (errorType === this.errorTypes.UNKNOWN_ERROR) {
      const customMessage = this.extractErrorMessage(error);
      if (customMessage && customMessage.length > 0 && customMessage !== '{}') {
        return {
          title: 'Error',
          message: customMessage,
          action: 'Try Again',
          actionType: 'retry'
        };
      }
    }
    
    return defaultError || this.errorMessages[this.errorTypes.UNKNOWN_ERROR];
  }

  // Handle error with callback actions
  handleError(error, callbacks = {}) {
    const friendlyError = this.getFriendlyError(error);
    console.log('Friendly error:', friendlyError);
    
    // Log error for debugging
    console.error('Error occurred:', {
      original: error,
      friendly: friendlyError
    });
    
    // Execute callback based on action type
    if (friendlyError.actionType === 'login' && callbacks.onLogin) {
      callbacks.onLogin();
    }
    
    if (friendlyError.actionType === 'retry' && callbacks.onRetry) {
      callbacks.onRetry();
    }
    
    if (friendlyError.actionType === 'contact' && callbacks.onContact) {
      callbacks.onContact();
    }
    
    if (friendlyError.actionType === 'punch_out' && callbacks.onPunchOut) {
      callbacks.onPunchOut();
    }
    
    if (friendlyError.actionType === 'schedule' && callbacks.onViewSchedule) {
      callbacks.onViewSchedule();
    }
    
    if (friendlyError.actionType === 'wait' && callbacks.onWait) {
      callbacks.onWait();
    }
    
    if (friendlyError.actionType === 'fix' && callbacks.onFix) {
      callbacks.onFix();
    }
    
    return friendlyError;
  }

  // Get error message string (simple version)
  getErrorMessage(error) {
    const friendly = this.getFriendlyError(error);
    return friendly.message;
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();
export default errorHandler;