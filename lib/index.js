var ElasticQueue, Hoek, async, baseConfig, events,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Hoek = require('hoek');

async = require('async');

events = require('events');

baseConfig = {
  concurency: 1,
  batchSize: 500,
  commitTimeout: 1000,
  rateLimit: 2000,
  batchHandler: 'elasticsearch-handler'
};

ElasticQueue = (function(superClass) {
  extend(ElasticQueue, superClass);

  function ElasticQueue(config, client) {
    if (config == null) {
      config = {};
    }
    this.client = client;
    this.task = bind(this.task, this);
    this.batchComplete = bind(this.batchComplete, this);
    this.batch = bind(this.batch, this);
    this.check = bind(this.check, this);
    this.drain = bind(this.drain, this);
    this.config = Hoek.applyToDefaults(baseConfig, config);
    this.queue = [];
    this.checkTimer = setInterval(this.check, this.config.rateLimit);
    this.setupHandler();
    this.async = async.queue(this.task, this.config.concurency);
    this.async.drain = this.drain;
    this.count = 1;
  }

  ElasticQueue.prototype.setupHandler = function() {
    var ref, ref1, ref2;
    if (typeof ((ref = this.config) != null ? ref.batchHandler : void 0) === 'string') {
      return this.handler = new (require("./handlers/" + ((ref1 = this.config) != null ? ref1.batchHandler : void 0)))(this.config, this.client);
    } else {
      return this.handler = (ref2 = this.config) != null ? new ref2.batchHandler(this.config, this.client) : void 0;
    }
  };

  ElasticQueue.prototype.drain = function() {
    if (this.queue.length === 0) {
      return this.emit('drain');
    }
  };

  ElasticQueue.prototype.push = function(task, callback) {
    if (callback == null) {
      callback = null;
    }
    return this.queue.push({
      task: task,
      callback: callback
    });
  };

  ElasticQueue.prototype.check = function() {
    if (this.queue.length > 0) {
      return this.batch();
    }
  };

  ElasticQueue.prototype.batch = function() {
    var size;
    size = this.queue.length;
    if (size >= this.config.batchSize) {
      size = this.config.batchSize;
    }
    if (size > 0) {
      this.async.push({
        batch: this.queue.splice(0, size),
        count: this.count++
      }, this.batchComplete);
    }
    if (this.queue.length > 0) {
      clearTimeout(this.batchTimeout);
      return this.batchTimeout = setTimeout(this.batch, this.config.rateLimit + this.config.commitTimeout);
    }
  };

  ElasticQueue.prototype.batchComplete = function(err, resp, task) {
    this.handler.batchComplete(err, resp, task);
    if (err) {
      return this.emit('error', err);
    }
    return this.emit('batchComplete', resp);
  };

  ElasticQueue.prototype.task = function(task, callback) {
    this.emit('task', task);
    return this.handler.batchTask(task, callback);
  };

  ElasticQueue.prototype.close = function() {
    return this.handler.close();
  };

  return ElasticQueue;

})(events.EventEmitter);

module.exports = ElasticQueue;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLDZDQUFBO0VBQUE7OzZCQUFBOztBQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUixDQUFQLENBQUE7O0FBQUEsS0FDQSxHQUFRLE9BQUEsQ0FBUSxPQUFSLENBRFIsQ0FBQTs7QUFBQSxNQUVBLEdBQVMsT0FBQSxDQUFRLFFBQVIsQ0FGVCxDQUFBOztBQUFBLFVBSUEsR0FDRTtBQUFBLEVBQUEsVUFBQSxFQUFZLENBQVo7QUFBQSxFQUNBLFNBQUEsRUFBVyxHQURYO0FBQUEsRUFFQSxhQUFBLEVBQWUsSUFGZjtBQUFBLEVBR0EsU0FBQSxFQUFXLElBSFg7QUFBQSxFQUlBLFlBQUEsRUFBYyx1QkFKZDtDQUxGLENBQUE7O0FBQUE7QUFhRSxrQ0FBQSxDQUFBOztBQUFhLEVBQUEsc0JBQUMsTUFBRCxFQUFjLE1BQWQsR0FBQTs7TUFBQyxTQUFTO0tBQ3JCO0FBQUEsSUFEeUIsSUFBQyxDQUFBLFNBQUQsTUFDekIsQ0FBQTtBQUFBLHFDQUFBLENBQUE7QUFBQSx1REFBQSxDQUFBO0FBQUEsdUNBQUEsQ0FBQTtBQUFBLHVDQUFBLENBQUE7QUFBQSx1Q0FBQSxDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsTUFBRCxHQUFVLElBQUksQ0FBQyxlQUFMLENBQXFCLFVBQXJCLEVBQWlDLE1BQWpDLENBQVYsQ0FBQTtBQUFBLElBQ0EsSUFBQyxDQUFBLEtBQUQsR0FBUyxFQURULENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxVQUFELEdBQWMsV0FBQSxDQUFZLElBQUMsQ0FBQSxLQUFiLEVBQW9CLElBQUMsQ0FBQSxNQUFNLENBQUMsU0FBNUIsQ0FGZCxDQUFBO0FBQUEsSUFHQSxJQUFDLENBQUEsWUFBRCxDQUFBLENBSEEsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLEtBQUQsR0FBUyxLQUFLLENBQUMsS0FBTixDQUFZLElBQUMsQ0FBQSxJQUFiLEVBQW1CLElBQUMsQ0FBQSxNQUFNLENBQUMsVUFBM0IsQ0FKVCxDQUFBO0FBQUEsSUFLQSxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQVAsR0FBZSxJQUFDLENBQUEsS0FMaEIsQ0FBQTtBQUFBLElBTUEsSUFBQyxDQUFBLEtBQUQsR0FBUyxDQU5ULENBRFc7RUFBQSxDQUFiOztBQUFBLHlCQVNBLFlBQUEsR0FBYyxTQUFBLEdBQUE7QUFDWixRQUFBLGVBQUE7QUFBQSxJQUFBLElBQUcsTUFBQSxDQUFBLGtDQUFjLENBQUUsc0JBQWhCLEtBQWdDLFFBQW5DO2FBQ0UsSUFBQyxDQUFBLE9BQUQsR0FBZSxJQUFBLENBQUUsT0FBQSxDQUFRLGFBQUEsR0FBYSxvQ0FBUSxDQUFFLHFCQUFWLENBQXJCLENBQUYsQ0FBQSxDQUFrRCxJQUFDLENBQUEsTUFBbkQsRUFBMkQsSUFBQyxDQUFBLE1BQTVELEVBRGpCO0tBQUEsTUFBQTthQUdFLElBQUMsQ0FBQSxPQUFELGtDQUFlLFFBQU8sQ0FBRSxZQUFULENBQXNCLElBQUMsQ0FBQSxNQUF2QixFQUErQixJQUFDLENBQUEsTUFBaEMsV0FIakI7S0FEWTtFQUFBLENBVGQsQ0FBQTs7QUFBQSx5QkFlQSxLQUFBLEdBQU8sU0FBQSxHQUFBO0FBQ0wsSUFBQSxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBUCxLQUFpQixDQUFwQjthQUNFLElBQUMsQ0FBQSxJQUFELENBQU0sT0FBTixFQURGO0tBREs7RUFBQSxDQWZQLENBQUE7O0FBQUEseUJBbUJBLElBQUEsR0FBTSxTQUFDLElBQUQsRUFBTyxRQUFQLEdBQUE7O01BQU8sV0FBVztLQUN0QjtXQUFBLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBUCxDQUFZO0FBQUEsTUFBRSxJQUFBLEVBQU0sSUFBUjtBQUFBLE1BQWMsUUFBQSxFQUFVLFFBQXhCO0tBQVosRUFESTtFQUFBLENBbkJOLENBQUE7O0FBQUEseUJBc0JBLEtBQUEsR0FBTyxTQUFBLEdBQUE7QUFDTCxJQUFBLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFQLEdBQWdCLENBQW5CO2FBQ0UsSUFBQyxDQUFBLEtBQUQsQ0FBQSxFQURGO0tBREs7RUFBQSxDQXRCUCxDQUFBOztBQUFBLHlCQTBCQSxLQUFBLEdBQU8sU0FBQSxHQUFBO0FBQ0wsUUFBQSxJQUFBO0FBQUEsSUFBQSxJQUFBLEdBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFkLENBQUE7QUFDQSxJQUFBLElBQTRCLElBQUEsSUFBUSxJQUFDLENBQUEsTUFBTSxDQUFDLFNBQTVDO0FBQUEsTUFBQSxJQUFBLEdBQU8sSUFBQyxDQUFBLE1BQU0sQ0FBQyxTQUFmLENBQUE7S0FEQTtBQUdBLElBQUEsSUFBRyxJQUFBLEdBQU8sQ0FBVjtBQUNFLE1BQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFQLENBQ0U7QUFBQSxRQUFBLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQVAsQ0FBYyxDQUFkLEVBQWlCLElBQWpCLENBQVA7QUFBQSxRQUNBLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBRCxFQURQO09BREYsRUFHRSxJQUFDLENBQUEsYUFISCxDQUFBLENBREY7S0FIQTtBQVNBLElBQUEsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQVAsR0FBZ0IsQ0FBbkI7QUFDRSxNQUFBLFlBQUEsQ0FBYSxJQUFDLENBQUEsWUFBZCxDQUFBLENBQUE7YUFDQSxJQUFDLENBQUEsWUFBRCxHQUNFLFVBQUEsQ0FBVyxJQUFDLENBQUEsS0FBWixFQUFtQixJQUFDLENBQUEsTUFBTSxDQUFDLFNBQVIsR0FBb0IsSUFBQyxDQUFBLE1BQU0sQ0FBQyxhQUEvQyxFQUhKO0tBVks7RUFBQSxDQTFCUCxDQUFBOztBQUFBLHlCQXlDQSxhQUFBLEdBQWUsU0FBQyxHQUFELEVBQU0sSUFBTixFQUFZLElBQVosR0FBQTtBQUNiLElBQUEsSUFBQyxDQUFBLE9BQU8sQ0FBQyxhQUFULENBQXVCLEdBQXZCLEVBQTRCLElBQTVCLEVBQWtDLElBQWxDLENBQUEsQ0FBQTtBQUNBLElBQUEsSUFBOEIsR0FBOUI7QUFBQSxhQUFPLElBQUMsQ0FBQSxJQUFELENBQU0sT0FBTixFQUFlLEdBQWYsQ0FBUCxDQUFBO0tBREE7V0FFQSxJQUFDLENBQUEsSUFBRCxDQUFNLGVBQU4sRUFBdUIsSUFBdkIsRUFIYTtFQUFBLENBekNmLENBQUE7O0FBQUEseUJBOENBLElBQUEsR0FBTSxTQUFDLElBQUQsRUFBTyxRQUFQLEdBQUE7QUFDSixJQUFBLElBQUMsQ0FBQSxJQUFELENBQU0sTUFBTixFQUFjLElBQWQsQ0FBQSxDQUFBO1dBQ0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxTQUFULENBQW1CLElBQW5CLEVBQXlCLFFBQXpCLEVBRkk7RUFBQSxDQTlDTixDQUFBOztBQUFBLHlCQWtEQSxLQUFBLEdBQU8sU0FBQSxHQUFBO1dBQ0wsSUFBQyxDQUFBLE9BQU8sQ0FBQyxLQUFULENBQUEsRUFESztFQUFBLENBbERQLENBQUE7O3NCQUFBOztHQUZ5QixNQUFNLENBQUMsYUFYbEMsQ0FBQTs7QUFBQSxNQWtFTSxDQUFDLE9BQVAsR0FBaUIsWUFsRWpCLENBQUEiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyJIb2VrID0gcmVxdWlyZSAnaG9laydcbmFzeW5jID0gcmVxdWlyZSAnYXN5bmMnXG5ldmVudHMgPSByZXF1aXJlICdldmVudHMnXG5cbmJhc2VDb25maWcgPVxuICBjb25jdXJlbmN5OiAxICMgbnVtYmVyIG9mIGFjdGl2ZSBiYXRjaGVzXG4gIGJhdGNoU2l6ZTogNTAwICMgYmF0Y2ggc2l6ZVxuICBjb21taXRUaW1lb3V0OiAxMDAwICMgd2FpdCB0aW1lIGJlZm9yZSBzZW5kaW5nIHBhcnRpYWwgYmF0Y2hlc1xuICByYXRlTGltaXQ6IDIwMDBcbiAgYmF0Y2hIYW5kbGVyOiAnZWxhc3RpY3NlYXJjaC1oYW5kbGVyJ1xuXG5jbGFzcyBFbGFzdGljUXVldWUgZXh0ZW5kcyBldmVudHMuRXZlbnRFbWl0dGVyXG5cbiAgY29uc3RydWN0b3I6IChjb25maWcgPSB7fSwgQGNsaWVudCkgLT5cbiAgICBAY29uZmlnID0gSG9lay5hcHBseVRvRGVmYXVsdHMgYmFzZUNvbmZpZywgY29uZmlnXG4gICAgQHF1ZXVlID0gW11cbiAgICBAY2hlY2tUaW1lciA9IHNldEludGVydmFsIEBjaGVjaywgQGNvbmZpZy5yYXRlTGltaXRcbiAgICBAc2V0dXBIYW5kbGVyKClcbiAgICBAYXN5bmMgPSBhc3luYy5xdWV1ZSBAdGFzaywgQGNvbmZpZy5jb25jdXJlbmN5XG4gICAgQGFzeW5jLmRyYWluID0gQGRyYWluXG4gICAgQGNvdW50ID0gMVxuXG4gIHNldHVwSGFuZGxlcjogKCkgLT5cbiAgICBpZiB0eXBlb2YgQGNvbmZpZz8uYmF0Y2hIYW5kbGVyIGlzICdzdHJpbmcnXG4gICAgICBAaGFuZGxlciA9IG5ldyAoIHJlcXVpcmUgXCIuL2hhbmRsZXJzLyN7QGNvbmZpZz8uYmF0Y2hIYW5kbGVyfVwiICkoQGNvbmZpZywgQGNsaWVudClcbiAgICBlbHNlXG4gICAgICBAaGFuZGxlciA9IG5ldyBAY29uZmlnPy5iYXRjaEhhbmRsZXIoQGNvbmZpZywgQGNsaWVudClcblxuICBkcmFpbjogPT5cbiAgICBpZiBAcXVldWUubGVuZ3RoIGlzIDBcbiAgICAgIEBlbWl0ICdkcmFpbidcblxuICBwdXNoOiAodGFzaywgY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIEBxdWV1ZS5wdXNoIHsgdGFzazogdGFzaywgY2FsbGJhY2s6IGNhbGxiYWNrIH1cblxuICBjaGVjazogPT5cbiAgICBpZiBAcXVldWUubGVuZ3RoID4gMFxuICAgICAgQGJhdGNoKClcblxuICBiYXRjaDogPT5cbiAgICBzaXplID0gQHF1ZXVlLmxlbmd0aFxuICAgIHNpemUgPSBAY29uZmlnLmJhdGNoU2l6ZSBpZiBzaXplID49IEBjb25maWcuYmF0Y2hTaXplXG5cbiAgICBpZiBzaXplID4gMFxuICAgICAgQGFzeW5jLnB1c2hcbiAgICAgICAgYmF0Y2g6IEBxdWV1ZS5zcGxpY2UoMCwgc2l6ZSlcbiAgICAgICAgY291bnQ6IEBjb3VudCsrLFxuICAgICAgICBAYmF0Y2hDb21wbGV0ZVxuXG4gICAgaWYgQHF1ZXVlLmxlbmd0aCA+IDBcbiAgICAgIGNsZWFyVGltZW91dCBAYmF0Y2hUaW1lb3V0XG4gICAgICBAYmF0Y2hUaW1lb3V0ID1cbiAgICAgICAgc2V0VGltZW91dCBAYmF0Y2gsIEBjb25maWcucmF0ZUxpbWl0ICsgQGNvbmZpZy5jb21taXRUaW1lb3V0XG5cbiAgYmF0Y2hDb21wbGV0ZTogKGVyciwgcmVzcCwgdGFzaykgPT5cbiAgICBAaGFuZGxlci5iYXRjaENvbXBsZXRlIGVyciwgcmVzcCwgdGFza1xuICAgIHJldHVybiBAZW1pdCgnZXJyb3InLCBlcnIpIGlmIGVyclxuICAgIEBlbWl0ICdiYXRjaENvbXBsZXRlJywgcmVzcFxuXG4gIHRhc2s6ICh0YXNrLCBjYWxsYmFjaykgPT5cbiAgICBAZW1pdCAndGFzaycsIHRhc2tcbiAgICBAaGFuZGxlci5iYXRjaFRhc2sgdGFzaywgY2FsbGJhY2tcblxuICBjbG9zZTogLT5cbiAgICBAaGFuZGxlci5jbG9zZSgpXG5cbm1vZHVsZS5leHBvcnRzID0gRWxhc3RpY1F1ZXVlXG4iXX0=