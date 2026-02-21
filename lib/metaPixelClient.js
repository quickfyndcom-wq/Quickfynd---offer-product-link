"use client";

export const getAttributionData = () => {
  if (typeof window === 'undefined') return {};
  return window.attributionData || {};
};

export const normalizeMetaError = (error) => {
  if (!error) return 'Unknown Meta Pixel error';
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    return error.message || error.error || error.detail || JSON.stringify(error);
  }
  return String(error);
};

export const trackMetaEvent = (eventName, params = {}, options = {}) => {
  if (typeof window === 'undefined' || !window.fbq || !eventName) return false;

  try {
    const payload = {
      ...params,
      ...getAttributionData(),
    };

    if (options?.eventID) {
      window.fbq('track', eventName, payload, { eventID: options.eventID });
    } else {
      window.fbq('track', eventName, payload);
    }

    return true;
  } catch (error) {
    console.warn('[MetaPixel] track error:', normalizeMetaError(error));
    return false;
  }
};
