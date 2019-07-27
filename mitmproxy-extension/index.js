#!/usr/bin/env node

process.stdin.resume();
// process.stdout.write('{"method": "log","msg": "hey!"}');
// // console.log('hey');
const uuidv1 = require('uuid/v1');
const fs = require('fs');
const { exec } = require('child_process');

var nativeMessage = require('chrome-native-messaging');

function startProxy(port) {
  exec(
    `mitmdump --listen-port ${port} -s /usr/local/bin/mitmproxy-script.py > /dev/null`,
    (err, stdout, stderr) => {
      if (err) {
        // node couldn't execute the command
        return;
      }

      // the *entire* stdout and stderr (buffered)
      process.stderr.write(`stdout: ${stdout}\n\n`);
      process.stderr.write(`stderr: ${stderr}\n\n`);
    },
  );
}

function getReplyFor(message) {
  process.stderr.write(JSON.stringify(message) + '\n\n');
  let filename;

  switch (message.method) {
    case 'hello':
      return {
        msg: {
          method: 'log',
          msg: 'hello!',
        },
      };

    case 'start-proxy':
      startProxy(message.port);
      return {
        msg: {
          method: 'proxy-started',
        },
      };

    case 'update-rules':
      fs.writeFileSync(
        '/usr/local/bin/tamper_mapping.json',
        JSON.stringify(message.rules, true, 4),
      );
      return { msg: message };

    case 'cache-response':
      const urlFilename = message.filename;
      let fullFilePath;

      while (true) {
        filename = uuidv1() + '.' + urlFilename;
        fullFilePath = '/usr/local/bin/tamper_overrides/' + filename;
        if (!fs.existsSync(fullFilePath)) {
          break;
        }
      }

      fs.writeFileSync(fullFilePath, message.responseContent);
      delete message.responseContent;
      message.cachedFilename = filename;

      return { msg: message };

    case 'open-file':
      if (message.testFile) {
        // TODO
        // filename = sys.prefix + '/tamper-files/testfile.txt';
      } else {
        filename = '/usr/local/bin/tamper_overrides/' + message.filename;
      }

      try {
        if (message.command) {
          exec(`${message.command} ${filename}`);
        }
        return { msg: message };
      } catch (err) {}

    case 'update-rules':
      return { msg: { method: '' } };
    default:
      return { ...message, method: 'log' };
  }
}

process.stdin
  .pipe(new nativeMessage.Input())
  .pipe(
    new nativeMessage.Transform(function(msg, push, done) {
      var reply = getReplyFor(msg); // Implemented elsewhere by you.
      push(reply); // Push as many replies as you like.
      done(); // Call when done pushing replies.
    }),
  )
  .pipe(new nativeMessage.Output())
  .pipe(process.stdout);
