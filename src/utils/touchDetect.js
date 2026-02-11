let _isTouch = null;

export function isTouchDevice() {
  if (_isTouch === null) {
    _isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }
  return _isTouch;
}
