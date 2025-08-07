/**
 * Comprehensive error handling and recovery utilities for the Call SDK
 */

export enum CallErrorType {
  // Connection errors
  CONNECTION_FAILED = "CONNECTION_FAILED",
  CONNECTION_LOST = "CONNECTION_LOST",
  RECONNECTION_FAILED = "RECONNECTION_FAILED",
  WEBSOCKET_ERROR = "WEBSOCKET_ERROR",

  // Media errors
  MEDIA_DEVICE_ERROR = "MEDIA_DEVICE_ERROR",
  MEDIA_PERMISSION_DENIED = "MEDIA_PERMISSION_DENIED",
  MEDIA_STREAM_ERROR = "MEDIA_STREAM_ERROR",
  SCREEN_SHARE_ERROR = "SCREEN_SHARE_ERROR",

  // MediaSoup errors
  TRANSPORT_ERROR = "TRANSPORT_ERROR",
  PRODUCER_ERROR = "PRODUCER_ERROR",
  CONSUMER_ERROR = "CONSUMER_ERROR",
  RTP_CAPABILITIES_ERROR = "RTP_CAPABILITIES_ERROR",

  // Room/Call errors
  ROOM_NOT_FOUND = "ROOM_NOT_FOUND",
  ROOM_FULL = "ROOM_FULL",
  PARTICIPANT_LIMIT_EXCEEDED = "PARTICIPANT_LIMIT_EXCEEDED",
  INVALID_ROOM_ID = "INVALID_ROOM_ID",

  // Authentication errors
  UNAUTHORIZED = "UNAUTHORIZED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",

  // General errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}

export interface CallErrorDetails {
  type: CallErrorType;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: Date;
  recoverable: boolean;
  retryable: boolean;
}

export class CallError extends Error {
  public readonly type: CallErrorType;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;

  constructor(details: CallErrorDetails) {
    super(details.message);
    this.name = "CallError";
    this.type = details.type;
    this.originalError = details.originalError;
    this.context = details.context;
    this.timestamp = details.timestamp;
    this.recoverable = details.recoverable;
    this.retryable = details.retryable;
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
      retryable: this.retryable,
      stack: this.stack,
    };
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: CallError) => void> = [];
  private retryAttempts = new Map<string, number>();
  private maxRetryAttempts = 3;
  private retryDelay = 1000; // Base delay in ms

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Add an error listener
   */
  onError(listener: (error: CallError) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Handle an error with automatic recovery if possible
   */
  async handleError(
    error: Error | CallError,
    context?: Record<string, any>
  ): Promise<void> {
    const callError =
      error instanceof CallError ? error : this.createCallError(error, context);

    // Notify listeners
    this.errorListeners.forEach((listener) => {
      try {
        listener(callError);
      } catch (err) {
        console.error("Error in error listener:", err);
      }
    });

    // Attempt recovery if the error is recoverable
    if (callError.recoverable) {
      await this.attemptRecovery(callError);
    }
  }

  /**
   * Create a CallError from a generic Error
   */
  createCallError(error: Error, context?: Record<string, any>): CallError {
    const type = this.categorizeError(error);
    const { recoverable, retryable } = this.getErrorProperties(type);

    return new CallError({
      type,
      message: error.message || "An unknown error occurred",
      originalError: error,
      context,
      timestamp: new Date(),
      recoverable,
      retryable,
    });
  }

  /**
   * Categorize an error based on its properties
   */
  private categorizeError(error: Error): CallErrorType {
    const message = error.message.toLowerCase();

    // Connection errors
    if (message.includes("websocket") || message.includes("connection")) {
      if (message.includes("failed") || message.includes("refused")) {
        return CallErrorType.CONNECTION_FAILED;
      }
      if (message.includes("lost") || message.includes("closed")) {
        return CallErrorType.CONNECTION_LOST;
      }
      return CallErrorType.WEBSOCKET_ERROR;
    }

    // Media errors
    if (message.includes("permission") || message.includes("denied")) {
      return CallErrorType.MEDIA_PERMISSION_DENIED;
    }
    if (
      message.includes("device") ||
      message.includes("microphone") ||
      message.includes("camera")
    ) {
      return CallErrorType.MEDIA_DEVICE_ERROR;
    }
    if (message.includes("screen") || message.includes("display")) {
      return CallErrorType.SCREEN_SHARE_ERROR;
    }
    if (message.includes("stream") || message.includes("track")) {
      return CallErrorType.MEDIA_STREAM_ERROR;
    }

    // MediaSoup errors
    if (message.includes("transport")) {
      return CallErrorType.TRANSPORT_ERROR;
    }
    if (message.includes("producer")) {
      return CallErrorType.PRODUCER_ERROR;
    }
    if (message.includes("consumer")) {
      return CallErrorType.CONSUMER_ERROR;
    }
    if (message.includes("rtp") || message.includes("capabilities")) {
      return CallErrorType.RTP_CAPABILITIES_ERROR;
    }

    // Room errors
    if (message.includes("room not found") || message.includes("404")) {
      return CallErrorType.ROOM_NOT_FOUND;
    }
    if (message.includes("room full") || message.includes("capacity")) {
      return CallErrorType.ROOM_FULL;
    }
    if (message.includes("participant limit")) {
      return CallErrorType.PARTICIPANT_LIMIT_EXCEEDED;
    }

    // Auth errors
    if (message.includes("unauthorized") || message.includes("401")) {
      return CallErrorType.UNAUTHORIZED;
    }
    if (message.includes("token") || message.includes("expired")) {
      return CallErrorType.TOKEN_EXPIRED;
    }

    // Network errors
    if (message.includes("network") || message.includes("timeout")) {
      return CallErrorType.NETWORK_ERROR;
    }

    return CallErrorType.UNKNOWN_ERROR;
  }

  /**
   * Get error properties based on error type
   */
  private getErrorProperties(type: CallErrorType): {
    recoverable: boolean;
    retryable: boolean;
  } {
    switch (type) {
      case CallErrorType.CONNECTION_LOST:
      case CallErrorType.WEBSOCKET_ERROR:
      case CallErrorType.TRANSPORT_ERROR:
      case CallErrorType.NETWORK_ERROR:
        return { recoverable: true, retryable: true };

      case CallErrorType.CONNECTION_FAILED:
      case CallErrorType.PRODUCER_ERROR:
      case CallErrorType.CONSUMER_ERROR:
        return { recoverable: true, retryable: true };

      case CallErrorType.MEDIA_DEVICE_ERROR:
      case CallErrorType.MEDIA_STREAM_ERROR:
        return { recoverable: true, retryable: false };

      case CallErrorType.MEDIA_PERMISSION_DENIED:
      case CallErrorType.UNAUTHORIZED:
      case CallErrorType.TOKEN_EXPIRED:
      case CallErrorType.ROOM_NOT_FOUND:
      case CallErrorType.ROOM_FULL:
      case CallErrorType.PARTICIPANT_LIMIT_EXCEEDED:
        return { recoverable: false, retryable: false };

      default:
        return { recoverable: false, retryable: true };
    }
  }

  /**
   * Attempt to recover from an error
   */
  private async attemptRecovery(error: CallError): Promise<void> {
    const recoveryKey = `${error.type}_${error.context?.roomId || "global"}`;
    const attempts = this.retryAttempts.get(recoveryKey) || 0;

    if (!error.retryable || attempts >= this.maxRetryAttempts) {
      this.retryAttempts.delete(recoveryKey);
      return;
    }

    this.retryAttempts.set(recoveryKey, attempts + 1);

    // Exponential backoff
    const delay = this.retryDelay * Math.pow(2, attempts);
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.executeRecovery(error);
      this.retryAttempts.delete(recoveryKey); // Success, reset attempts
    } catch (recoveryError) {
      console.error("Recovery attempt failed:", recoveryError);
      // Will retry on next error if retryable
    }
  }

  /**
   * Execute recovery based on error type
   */
  private async executeRecovery(error: CallError): Promise<void> {
    switch (error.type) {
      case CallErrorType.CONNECTION_LOST:
      case CallErrorType.WEBSOCKET_ERROR:
        // Trigger reconnection
        if (
          error.context?.reconnect &&
          typeof error.context.reconnect === "function"
        ) {
          await error.context.reconnect();
        }
        break;

      case CallErrorType.TRANSPORT_ERROR:
        // Recreate transport
        if (
          error.context?.recreateTransport &&
          typeof error.context.recreateTransport === "function"
        ) {
          await error.context.recreateTransport();
        }
        break;

      case CallErrorType.PRODUCER_ERROR:
        // Recreate producer
        if (
          error.context?.recreateProducer &&
          typeof error.context.recreateProducer === "function"
        ) {
          await error.context.recreateProducer();
        }
        break;

      case CallErrorType.CONSUMER_ERROR:
        // Recreate consumer
        if (
          error.context?.recreateConsumer &&
          typeof error.context.recreateConsumer === "function"
        ) {
          await error.context.recreateConsumer();
        }
        break;

      case CallErrorType.MEDIA_DEVICE_ERROR:
      case CallErrorType.MEDIA_STREAM_ERROR:
        // Reinitialize media
        if (
          error.context?.reinitializeMedia &&
          typeof error.context.reinitializeMedia === "function"
        ) {
          await error.context.reinitializeMedia();
        }
        break;

      default:
        console.warn(`No recovery strategy for error type: ${error.type}`);
    }
  }

  /**
   * Reset retry attempts for a specific key
   */
  resetRetryAttempts(key?: string): void {
    if (key) {
      this.retryAttempts.delete(key);
    } else {
      this.retryAttempts.clear();
    }
  }

  /**
   * Configure retry settings
   */
  configure(options: { maxRetryAttempts?: number; retryDelay?: number }): void {
    if (options.maxRetryAttempts !== undefined) {
      this.maxRetryAttempts = options.maxRetryAttempts;
    }
    if (options.retryDelay !== undefined) {
      this.retryDelay = options.retryDelay;
    }
  }
}

// Convenience functions
export const errorHandler = ErrorHandler.getInstance();

export function createCallError(
  type: CallErrorType,
  message: string,
  options?: {
    originalError?: Error;
    context?: Record<string, any>;
    recoverable?: boolean;
    retryable?: boolean;
  }
): CallError {
  const { recoverable, retryable } = errorHandler["getErrorProperties"](type);

  return new CallError({
    type,
    message,
    originalError: options?.originalError,
    context: options?.context,
    timestamp: new Date(),
    recoverable: options?.recoverable ?? recoverable,
    retryable: options?.retryable ?? retryable,
  });
}

export function handleError(
  error: Error | CallError,
  context?: Record<string, any>
): Promise<void> {
  return errorHandler.handleError(error, context);
}

export function onError(listener: (error: CallError) => void): () => void {
  return errorHandler.onError(listener);
}
