var _ = fis.util;
var portfinder = require('portfinder');
var weinre = require("weinre");
var rWeinre = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(<\/body>|<!--weinre-->)/ig;
var weinreServer;
var weinrePort;
var weinreUsername;

var defaultHostname = (function() {
  var ip = false;
  var net = require('os').networkInterfaces();
  /*
	获取fis-config.js中配置的默认host规则，可以是字符串或正则，字符串中 * 可以代表任意数字。
	使用示例：fis.config.set('weinre-iprule', '192.168.*.*')
	适用场景：机器上安装虚拟机后，会有很多虚拟网卡，默认获取的ip在局域网中访问不到，手机调试时加载不了。
  */
  var iprule = fis.config.get('weinre-iprule');
  if(iprule && typeof(iprule) === 'string'){
	  iprule = new RegExp('^' + iprule.replace(/\.|\*/g, function(v){
		  return v === '.'? '\\\.' : '\\\d+'
	  }) + '$');
  }else if(!(iprule instanceof RegExp)){
	  iprule = /^\d+(?:\.\d+){3}$/;
  }
  Object.keys(net).every(function(key) {
    var detail = net[key];
    Object.keys(detail).every(function(i) {
      var address = String(detail[i].address).trim();
      if (address && iprule.test(address)) {
        ip = address;
      }
      return !ip; // 找到了，则跳出循环
    });
    return !ip; // 找到了，则跳出循环
  });
  return ip || '127.0.0.1';
})();


function openUrl(path, callback) {
    var child_process = require('child_process');
    fis.log.notice('browse ' + path.yellow.bold + '\n');
    var cmd = fis.util.escapeShellArg(path);
    if(fis.util.isWin()){
        cmd = 'start "" ' + cmd;
    } else {
        if(process.env['XDG_SESSION_COOKIE']){
            cmd = 'xdg-open ' + cmd;
        } else if(process.env['GNOME_DESKTOP_SESSION_ID']){
            cmd = 'gnome-open ' + cmd;
        } else {
            cmd = 'open ' + cmd;
        }
    }
    child_process.exec(cmd, callback);
};


function makeLiveServer(callback) {
  if (weinreServer) return callback(null, weinreServer, weinrePort);

  var basePort = fis.media().get('weinre.port', 8081);

  // 获取下一个可用端口。
  portfinder.getPort({
    port: basePort
  }, function(error, port) {
    if (error) {
      fis.log.warn('The port %s for weinre is already in use!', basePort);
      return callback(error);
    }

    weinrePort = port;

    weinreServer = weinre.run({
      httpPort: weinrePort,
      boundHost: defaultHostname,
      verbose: false,
      debug: false,
      readTimeout: 5,
      deathTimeout: 15
    });

    openUrl('http://' + defaultHostname + ':' + weinrePort + '/client/#' + weinreUsername);

    process.on('uncaughtException', function(err) {
      if (err.message !== 'read ECONNRESET') throw err;
    });

    callback(null, weinreServer, weinrePort);
  });
}


function handleWeinreComment(obj, next) {
  var isWeinreMod = !!obj.options.weinre; 

  weinreUsername = obj.options.weinre === true ? 'mz-fis' : obj.options.weinre;

  fis.log.debug('handle weinre comment start');

  if (isWeinreMod) {
    makeLiveServer(function(error, server, port) {
      if (error) {
        return next(error);
      }

      _.toArray(obj.modified).forEach(function(file) {
        var content = file.getContent();

        if (!file.isHtmlLike || typeof content !== 'string') {
          return;
        }

        rWeinre.lastIndex = 0;
        content = content.replace(rWeinre, function(all, token) {
          if (token) {
            var hostname = fis.config.get('weinre.hostname', defaultHostname);

            all = '<script type="text/javascript" charset="utf-8" src="http://' + hostname + ':' + port + '/target/target-script-min.js#' + weinreUsername +'"></script>' + token;
          }

          return all;
        });

        file.setContent(content);
      });

      fis.log.debug('handle weinre comment end');

      next(null, obj);
    });
  } else {
    _.toArray(obj.modified).forEach(function(file) {
      var content = file.getContent();

      if (!file.isHtmlLike || typeof content !== 'string') {
        return;
      }

      content = content.replace(/<!--weinre-->/ig, '');
      file.setContent(content);
    });

    fis.log.debug('handle weinre comment end');
    next(null, obj);
  }


};


exports.handleWeinreComment = handleWeinreComment;
