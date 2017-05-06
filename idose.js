/** 
 * Module Name: idose
 * Description: dose recording
 */

var moment = require('moment-timezone'),
    _ = require('underscore')._,
    fs = require('fs'),
    exec = require('child_process').exec;

var idose = function(dbot) {
  var self = this;

  this.api = {
    // Save new dose entry
    'saveLastDose': function(user, drug, dose, callback) {
      var lDose = {
        'time': Date.now(),
        'drug': drug,
        'dose': dose
      };

      if(!_.has(dbot.db.idose, user) || !_.isArray(dbot.db.idose[user])) {
        dbot.db.idose[user] = [];
      }
      dbot.db.idose[user].push(lDose);

      callback(lDose);
    },

    // Retrieve user's last dose, by id
    'getLastDose': function(user, callback) {
      callback(_.last(dbot.db.idose[user.id])); 
    },

    'alsutu': function(user, tz) { // TODO: this belongs in its own module and is generally hax, bad
      tz = tz || 'Europe/London';
      var out = 'drug\tdose\ttime';

      _.each(dbot.db.idose[user.id], function(entry) {
        out += '\n'+entry.drug+'\t'+entry.dose+'\t'+moment(entry.time).tz(tz).format('HH:mm:ss DD/MM/YYYY');
      });

      fs.writeFileSync('/tmp/'+user.id+'dd.txt', out);

      function puts(error, stdout, stderr) { 
        var res = stdout.split('\n');        
        dbot.say(user.id.split('.')[1], user.primaryNick, 'New idose log at: ' + res[res.length-3]); 
      }
      exec("/home/node/alsuti/bin/alsuti -p "+randomString(12, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')+" /tmp/"+user.id+'dd.txt', puts);
    }
  };

  this.commands = {
    'idose': function(event) {
      var dose = event.params[1]
          dName = event.params[2],
          roa = event.params[3];

      if(roa) {
        roa = capitalise(roa);
      }

      dbot.api.tripsit.getDrug(dName, function(drug) {
        if(drug) {
          self.api.saveLastDose(event.rUser.id, dName, dose, function(lDose) {
            dName = drug.pretty_name;
            var tz = event.rProfile.timezone || 'Europe/London';
            var out = 'Dosed ' + dose + ' ' + dName + ' at ' + moment(lDose.time).tz(tz).format('HH:mm:ss on DD/MM/YYYY');
            if(roa) {
              out += ' via ' + roa;
            }
            out += '.';

            if(_.has(drug, 'formatted_onset')) {
              if(_.has(drug.formatted_onset, roa)) {
                out += ' You should start to feel effects ' + drug.formatted_onset[roa] + ' ' + drug.formatted_onset._unit + ' from now.'
              } else if(_.has(drug.formatted_onset, 'value')) {
                out += ' You should start to feel effects ' + drug.formatted_onset.value + ' ' + drug.formatted_onset._unit + ' from now.'
              }
            }
            out += ' (BTW, you can run ~set upidose true to have tripbot upload an encrypted version of your dose history to you upon updates).'
            event.reply(out);

            if(event.rProfile.upidose == "true") {
              self.api.alsutu(event.rUser, tz);
            }
          });
        } else {
          event.reply("I have not heard of that drug before mate, take a look at the list on http://drugs.tripsit.me/");
        }
      });
    },
    
    'lastdose': function(event) {
      this.api.getLastDose(event.rUser, function(lDose) {
        if(lDose) {
          var tz = event.rProfile.timezone || 'Europe/London';
          var out = 'You last dosed ' + lDose.dose + ' of ' + lDose.drug + ' ' + moment(lDose.time).toNow(true) + ' ago (' + moment(lDose.time).tz(tz).format('HH:mm:ss on DD/MM/YYYY') + ').';
          event.reply(out);
        } else {
          event.reply('No last dose recorded');
        }
      });
    }
  }

  this.onLoad = function() {
    if(!dbot.db.idose) {
      dbot.db.idose = {};
    }
  }
};
 
exports.fetch = function(dbot) {
    return new idose(dbot);
};

function capitalise(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
