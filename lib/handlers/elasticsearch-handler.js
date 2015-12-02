var ElasticSearchHandler, Hoek, baseConfig, elasticsearch;

Hoek = require('hoek');

elasticsearch = require('elasticsearch');

baseConfig = {
  elasticsearch: {
    client: {
      host: "localhost:9200",
      log: "info",
      minSockets: 1,
      sniffInterval: 60000,
      sniffOnStart: true,
      suggestCompression: true
    }
  }
};

ElasticSearchHandler = (function() {
  function ElasticSearchHandler(config, client) {
    this.client = client;
    this.config = Hoek.applyToDefaults(baseConfig, config);
    if (!this.client) {
      this.client = new elasticsearch.Client(this.config.elasticsearch.client);
    }
  }

  ElasticSearchHandler.prototype.batchTask = function(task, done) {
    var index, key, ref, value;
    index = [];
    ref = task.batch;
    for (key in ref) {
      value = ref[key];
      index.push({
        index: {
          _index: value.task.index,
          _type: value.task.type,
          _id: value.task.id
        }
      });
      if (value.task.body != null) {
        index.push(value.task.body);
      }
    }
    return this.client.bulk({
      body: index
    }, function(err, res) {
      if (err) {
        return done(err, null, task);
      }
      return done(null, res, task);
    });
  };

  ElasticSearchHandler.prototype.batchComplete = function(err, resp, task) {
    var messages;
    messages = [];
    if ((resp != null ? resp.items : void 0) != null) {
      resp.items.forEach(function(item) {
        var ref;
        return messages[item != null ? (ref = item.index) != null ? ref._id : void 0 : void 0] = item;
      });
    }
    if ((task != null ? task.batch : void 0) != null) {
      return task.batch.forEach(function(item) {
        var message, ref, ref1, ref2, ref3;
        if ((item != null ? item.callback : void 0) != null) {
          if (((item != null ? (ref = item.task) != null ? ref.id : void 0 : void 0) != null) && (messages[item != null ? (ref1 = item.task) != null ? ref1.id : void 0 : void 0] != null)) {
            message = messages[item != null ? (ref2 = item.task) != null ? ref2.id : void 0 : void 0];
            if ([200, 201].indexOf(message != null ? (ref3 = message.index) != null ? ref3.status : void 0 : void 0) > -1) {
              return item.callback(null, message);
            } else {
              return item.callback(new Error(message.index.error), message);
            }
          } else {
            return item.callback(err, resp);
          }
        }
      });
    }
  };

  ElasticSearchHandler.prototype.close = function() {
    if (this.client != null) {
      return this.client.close();
    }
  };

  return ElasticSearchHandler;

})();

module.exports = ElasticSearchHandler;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhhbmRsZXJzL2VsYXN0aWNzZWFyY2gtaGFuZGxlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBQSxxREFBQTs7QUFBQSxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVIsQ0FBUCxDQUFBOztBQUFBLGFBQ0EsR0FBZ0IsT0FBQSxDQUFRLGVBQVIsQ0FEaEIsQ0FBQTs7QUFBQSxVQUdBLEdBQ0U7QUFBQSxFQUFBLGFBQUEsRUFDRTtBQUFBLElBQUEsTUFBQSxFQUNFO0FBQUEsTUFBQSxJQUFBLEVBQU0sZ0JBQU47QUFBQSxNQUNBLEdBQUEsRUFBSyxNQURMO0FBQUEsTUFFQSxVQUFBLEVBQVksQ0FGWjtBQUFBLE1BR0EsYUFBQSxFQUFlLEtBSGY7QUFBQSxNQUlBLFlBQUEsRUFBYyxJQUpkO0FBQUEsTUFLQSxrQkFBQSxFQUFvQixJQUxwQjtLQURGO0dBREY7Q0FKRixDQUFBOztBQUFBO0FBZWUsRUFBQSw4QkFBQyxNQUFELEVBQVMsTUFBVCxHQUFBO0FBQ1gsSUFEb0IsSUFBQyxDQUFBLFNBQUQsTUFDcEIsQ0FBQTtBQUFBLElBQUEsSUFBQyxDQUFBLE1BQUQsR0FBVSxJQUFJLENBQUMsZUFBTCxDQUFxQixVQUFyQixFQUFpQyxNQUFqQyxDQUFWLENBQUE7QUFDQSxJQUFBLElBQUEsQ0FBQSxJQUFRLENBQUEsTUFBUjtBQUNFLE1BQUEsSUFBQyxDQUFBLE1BQUQsR0FBYyxJQUFBLGFBQWEsQ0FBQyxNQUFkLENBQXFCLElBQUMsQ0FBQSxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQTNDLENBQWQsQ0FERjtLQUZXO0VBQUEsQ0FBYjs7QUFBQSxpQ0FLQSxTQUFBLEdBQVcsU0FBQyxJQUFELEVBQU8sSUFBUCxHQUFBO0FBQ1QsUUFBQSxzQkFBQTtBQUFBLElBQUEsS0FBQSxHQUFRLEVBQVIsQ0FBQTtBQUNBO0FBQUEsU0FBQSxVQUFBO3VCQUFBO0FBQ0UsTUFBQSxLQUFLLENBQUMsSUFBTixDQUNFO0FBQUEsUUFBQSxLQUFBLEVBQ0U7QUFBQSxVQUFBLE1BQUEsRUFBUSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQW5CO0FBQUEsVUFDQSxLQUFBLEVBQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQURsQjtBQUFBLFVBRUEsR0FBQSxFQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFGaEI7U0FERjtPQURGLENBQUEsQ0FBQTtBQUtBLE1BQUEsSUFBOEIsdUJBQTlCO0FBQUEsUUFBQSxLQUFLLENBQUMsSUFBTixDQUFXLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBdEIsQ0FBQSxDQUFBO09BTkY7QUFBQSxLQURBO1dBU0EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxJQUFSLENBQWE7QUFBQSxNQUFBLElBQUEsRUFBTSxLQUFOO0tBQWIsRUFBMEIsU0FBQyxHQUFELEVBQU0sR0FBTixHQUFBO0FBQ3hCLE1BQUEsSUFBZ0MsR0FBaEM7QUFBQSxlQUFPLElBQUEsQ0FBSyxHQUFMLEVBQVUsSUFBVixFQUFnQixJQUFoQixDQUFQLENBQUE7T0FBQTthQUNBLElBQUEsQ0FBSyxJQUFMLEVBQVcsR0FBWCxFQUFnQixJQUFoQixFQUZ3QjtJQUFBLENBQTFCLEVBVlM7RUFBQSxDQUxYLENBQUE7O0FBQUEsaUNBbUJBLGFBQUEsR0FBZSxTQUFDLEdBQUQsRUFBTSxJQUFOLEVBQVksSUFBWixHQUFBO0FBQ2IsUUFBQSxRQUFBO0FBQUEsSUFBQSxRQUFBLEdBQVcsRUFBWCxDQUFBO0FBRUEsSUFBQSxJQUFHLDRDQUFIO0FBQ0UsTUFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQVgsQ0FBbUIsU0FBQyxJQUFELEdBQUE7QUFDakIsWUFBQSxHQUFBO2VBQUEsUUFBUyxnREFBVyxDQUFFLHFCQUFiLENBQVQsR0FBNkIsS0FEWjtNQUFBLENBQW5CLENBQUEsQ0FERjtLQUZBO0FBTUEsSUFBQSxJQUFHLDRDQUFIO2FBQ0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFYLENBQW1CLFNBQUMsSUFBRCxHQUFBO0FBQ2pCLFlBQUEsOEJBQUE7QUFBQSxRQUFBLElBQUcsK0NBQUg7QUFDRSxVQUFBLElBQUcsK0VBQUEsSUFBb0IseUZBQXZCO0FBQ0UsWUFBQSxPQUFBLEdBQVUsUUFBUyxpREFBVSxDQUFFLG9CQUFaLENBQW5CLENBQUE7QUFDQSxZQUFBLElBQUcsQ0FBQyxHQUFELEVBQU0sR0FBTixDQUFVLENBQUMsT0FBWCx3REFBaUMsQ0FBRSx3QkFBbkMsQ0FBQSxHQUE2QyxDQUFBLENBQWhEO3FCQUNFLElBQUksQ0FBQyxRQUFMLENBQWMsSUFBZCxFQUFvQixPQUFwQixFQURGO2FBQUEsTUFBQTtxQkFHRSxJQUFJLENBQUMsUUFBTCxDQUFrQixJQUFBLEtBQUEsQ0FBTSxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQXBCLENBQWxCLEVBQThDLE9BQTlDLEVBSEY7YUFGRjtXQUFBLE1BQUE7bUJBT0UsSUFBSSxDQUFDLFFBQUwsQ0FBYyxHQUFkLEVBQW1CLElBQW5CLEVBUEY7V0FERjtTQURpQjtNQUFBLENBQW5CLEVBREY7S0FQYTtFQUFBLENBbkJmLENBQUE7O0FBQUEsaUNBcUNBLEtBQUEsR0FBTyxTQUFBLEdBQUE7QUFDTCxJQUFBLElBQUcsbUJBQUg7YUFDRSxJQUFDLENBQUEsTUFBTSxDQUFDLEtBQVIsQ0FBQSxFQURGO0tBREs7RUFBQSxDQXJDUCxDQUFBOzs4QkFBQTs7SUFmRixDQUFBOztBQUFBLE1BeURNLENBQUMsT0FBUCxHQUFpQixvQkF6RGpCLENBQUEiLCJmaWxlIjoiaGFuZGxlcnMvZWxhc3RpY3NlYXJjaC1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiSG9layA9IHJlcXVpcmUgJ2hvZWsnXG5lbGFzdGljc2VhcmNoID0gcmVxdWlyZSAnZWxhc3RpY3NlYXJjaCdcblxuYmFzZUNvbmZpZyA9XG4gIGVsYXN0aWNzZWFyY2g6XG4gICAgY2xpZW50OlxuICAgICAgaG9zdDogXCJsb2NhbGhvc3Q6OTIwMFwiXG4gICAgICBsb2c6IFwiaW5mb1wiXG4gICAgICBtaW5Tb2NrZXRzOiAxXG4gICAgICBzbmlmZkludGVydmFsOiA2MDAwMFxuICAgICAgc25pZmZPblN0YXJ0OiB0cnVlXG4gICAgICBzdWdnZXN0Q29tcHJlc3Npb246IHRydWVcblxuXG5jbGFzcyBFbGFzdGljU2VhcmNoSGFuZGxlclxuICBjb25zdHJ1Y3RvcjogKGNvbmZpZywgQGNsaWVudCkgLT5cbiAgICBAY29uZmlnID0gSG9lay5hcHBseVRvRGVmYXVsdHMgYmFzZUNvbmZpZywgY29uZmlnXG4gICAgdW5sZXNzIEBjbGllbnRcbiAgICAgIEBjbGllbnQgPSBuZXcgZWxhc3RpY3NlYXJjaC5DbGllbnQgQGNvbmZpZy5lbGFzdGljc2VhcmNoLmNsaWVudFxuXG4gIGJhdGNoVGFzazogKHRhc2ssIGRvbmUpIC0+XG4gICAgaW5kZXggPSBbXVxuICAgIGZvciBrZXksIHZhbHVlIG9mIHRhc2suYmF0Y2hcbiAgICAgIGluZGV4LnB1c2hcbiAgICAgICAgaW5kZXg6XG4gICAgICAgICAgX2luZGV4OiB2YWx1ZS50YXNrLmluZGV4XG4gICAgICAgICAgX3R5cGU6IHZhbHVlLnRhc2sudHlwZVxuICAgICAgICAgIF9pZDogdmFsdWUudGFzay5pZFxuICAgICAgaW5kZXgucHVzaCB2YWx1ZS50YXNrLmJvZHkgaWYgdmFsdWUudGFzay5ib2R5P1xuXG4gICAgQGNsaWVudC5idWxrIGJvZHk6IGluZGV4LCAoZXJyLCByZXMpIC0+XG4gICAgICByZXR1cm4gZG9uZShlcnIsIG51bGwsIHRhc2spIGlmIGVyclxuICAgICAgZG9uZShudWxsLCByZXMsIHRhc2spXG5cbiAgYmF0Y2hDb21wbGV0ZTogKGVyciwgcmVzcCwgdGFzaykgLT5cbiAgICBtZXNzYWdlcyA9IFtdXG5cbiAgICBpZiByZXNwPy5pdGVtcz9cbiAgICAgIHJlc3AuaXRlbXMuZm9yRWFjaCAoaXRlbSkgLT5cbiAgICAgICAgbWVzc2FnZXNbaXRlbT8uaW5kZXg/Ll9pZF0gPSBpdGVtXG5cbiAgICBpZiB0YXNrPy5iYXRjaD9cbiAgICAgIHRhc2suYmF0Y2guZm9yRWFjaCAoaXRlbSkgLT5cbiAgICAgICAgaWYgaXRlbT8uY2FsbGJhY2s/XG4gICAgICAgICAgaWYgaXRlbT8udGFzaz8uaWQ/IGFuZCBtZXNzYWdlc1tpdGVtPy50YXNrPy5pZF0/XG4gICAgICAgICAgICBtZXNzYWdlID0gbWVzc2FnZXNbaXRlbT8udGFzaz8uaWRdXG4gICAgICAgICAgICBpZiBbMjAwLCAyMDFdLmluZGV4T2YobWVzc2FnZT8uaW5kZXg/LnN0YXR1cykgPiAtMVxuICAgICAgICAgICAgICBpdGVtLmNhbGxiYWNrKG51bGwsIG1lc3NhZ2UpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIGl0ZW0uY2FsbGJhY2sobmV3IEVycm9yKG1lc3NhZ2UuaW5kZXguZXJyb3IpLCBtZXNzYWdlKVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGl0ZW0uY2FsbGJhY2soZXJyLCByZXNwKVxuICBjbG9zZTogKCkgLT5cbiAgICBpZiBAY2xpZW50P1xuICAgICAgQGNsaWVudC5jbG9zZSgpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBFbGFzdGljU2VhcmNoSGFuZGxlclxuIl19