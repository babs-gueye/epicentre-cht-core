var _ = require('underscore'),
    promise = require('lie');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var updateMessage = function(user, read, message) {
    var readers = message.read || [];
    var index = readers.indexOf(user);
    if ((index !== -1) === read) {
      // already in the correct state
      return;
    }
    if (read) {
      readers.push(user);
    } else {
      readers.splice(index, 1);
    }
    message.read = readers;
    return message;
  };

  var updateMessages = function(user, read, messages) {
    return _.compact(_.map(messages, _.partial(updateMessage, user, read)));
  };
  
  inboxServices.factory('MarkRead', ['DB', 'Session',
    function(DB, Session) {
      return function(messageId, read) {
        var user = Session.userCtx().name;
        return new promise(function(resolve, reject) {
          DB.get().get(messageId)
            .then(_.partial(updateMessage, user, read))
            .then(function(doc) {
              if (!doc) {
                return resolve();
              }
              return DB.get()
                .put(doc)
                .then(resolve)
                .catch(reject);
            })
            .catch(reject);
        });
      };
    }
  ]);
  
  inboxServices.factory('MarkAllRead', ['DB', 'Session',
    function(DB, Session) {
      return function(messages, read) {
        var user = Session.userCtx().name;
        var updated = updateMessages(user, read, messages);
        return DB.get().bulkDocs(updated);
      };
    }
  ]);

}());