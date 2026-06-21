/**
 * Global patch for chrome.runtime.sendMessage
 * MUST be imported as the FIRST import in every bundle entry point
 * to prevent "Could not establish connection. Receiving end does not exist." errors.
 */
const _origSendMessage = (chrome.runtime.sendMessage as Function).bind(chrome.runtime);
(chrome.runtime as any).sendMessage = function (message: any, callback?: Function): any {
  if (typeof callback === 'function') {
    return _origSendMessage(message, callback);
  }
  const result = _origSendMessage(message);
  if (result && typeof result.catch === 'function') {
    return result.catch(() => undefined);
  }
  return result;
};
