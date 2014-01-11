/**
 * Read Linux mouse(s) in node.js
 * Author: Marc Loehe (marcloehe@gmail.com)
 *
 * Adapted from Tim Caswell's nice solution to read a linux joystick
 * http://nodebits.org/linux-joystick
 * https://github.com/nodebits/linux-joystick
 */
 
var fs = require('fs'),
    EventEmitter = require('events').EventEmitter;
 
/**
 * Parse PS/2 mouse protocol
 * According to http://www.computer-engineering.org/ps2mouse/
 */
function parse(mouse, buffer) {
  var event = {
    leftBtn:    (buffer[0] & 1  ) > 0, // Bit 0
    rightBtn:   (buffer[0] & 2  ) > 0, // Bit 1
    middleBtn:  (buffer[0] & 4  ) > 0, // Bit 2
    xSign:      (buffer[0] & 16 ) > 0, // Bit 4
    ySign:      (buffer[0] & 32 ) > 0, // Bit 5
    xOverflow:  (buffer[0] & 64 ) > 0, // Bit 6
    yOverflow:  (buffer[0] & 128) > 0, // Bit 7
    xDelta:      buffer.readInt8(1),   // Byte 2 as signed int
    yDelta:      buffer.readInt8(2)    // Byte 3 as signed int
  };
  if (event.leftBtn || event.rightBtn || event.middleBtn) {
    event.type = 'button';
  } else {
    event.type = 'moved';
  }
  return event;
}
 
function Mouse(mouseid) {
  this.wrap('onOpen');
  this.wrap('onRead');
  this.dev = typeof(mouseid) === 'number' ? 'mouse' + mouseid : 'mice';
  this.buf = new Buffer(3);
  fs.open('/dev/input/' + this.dev, 'r', this.onOpen);
}
 
Mouse.prototype = Object.create(EventEmitter.prototype, {
  constructor: {value: Mouse}
});
 
Mouse.prototype.wrap = function(name) {
  var self = this;
  var fn = this[name];
  this[name] = function (err) {
    if (err) return self.emit('error', err);
    return fn.apply(self, Array.prototype.slice.call(arguments, 1));
  };
};
 
Mouse.prototype.onOpen = function(fd) {
  this.fd = fd;
  this.startRead();
};
 
Mouse.prototype.startRead = function() {
  fs.read(this.fd, this.buf, 0, 3, null, this.onRead);
};
 
Mouse.prototype.onRead = function(bytesRead) {
  var event = parse(this, this.buf);
  event.dev = this.dev;
  this.emit(event.type, event);
  if (this.fd) this.startRead();
};
 
Mouse.prototype.close = function(callback) {
  fs.close(this.fd, (function(){console.log(this);}));
  this.fd = undefined;
}
 
/****************
 * Sample Usage *
 ****************/
 
// read all mouse events from /dev/input/mice
var mouse = new Mouse();
mouse.on('button', console.log);
mouse.on('moved', console.log);
 
// to read only a specific mouse by id (e.g. /dev/input/mouse0) use
// var mouse0 = newMouse(0);
 
// to close mouse
// mouse.close();
// mouse = undefined;
