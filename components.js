/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/**
 * Module dependencies.
 */
var url = require('url');
var fs = require('fs');
var async = require('async');
var path = require('path');
var wrench = require('wrench');
var child_process = require('child_process');

/*

  downloads and builds components as a proxy for the client side component loader
  
*/

module.exports = function(appconfig){

  var config = appconfig.config || {};
  var tmpfolder = '/tmp/diggercomponents';
  var stat = fs.existsSync(tmpfolder);

  if(stat){
    wrench.rmdirSyncRecursive(tmpfolder, 0777);
  }

  wrench.mkdirSyncRecursive(tmpfolder, 0777);
  
  return function(req, res, next){

    var username = null;
    var repo = null;

    var debug = req.query.debug=='y';

    // top level component not file in it
    var path = req.url.replace(/^\/([\w-]+)\/([\w-]+)/, function(match, u, r){
      username = u;
      repo = r;
      return '';
    });
    
    var basefolder = tmpfolder + '/' + username + '-' + repo;

    console.log('component: ' + basefolder);

    // is it a file
    if(path.match(/\.\w+$/)){
      res.sendfile(basefolder + path);
    }
    else{
      // does /tmp/diggercomponents/binocarlos-digger-url-component exist?
      fs.stat(basefolder, function(error, stat){
        if(stat){
          console.log('existing');
          res.sendfile(basefolder + '/build/build' + (debug ? '' : '.min') + '.js');
        }
        else{

          // the clone command is passed
          // it can either be a git pull or copy local folder

          function git_ok(){
            return (username || '').match(/\w/) && (repo || '').match(/\w/);
          }

          function git_clone(){
            return 'git clone https://github.com/' + username + '/' + repo + ' ' + username + '-' + repo;
          }

          function copy_local(){
            return 'cp -rf ' + config.development_folder + '/' + repo + ' ' + username + '-' + repo;
          }

          function run_build(clone_command){
            var command = [
              'cd ' + tmpfolder,
              ' && ' + clone_command,
              ' && cd ' + username + '-' + repo,
              ' && component install',
              ' && component build --no-require',
              ' && uglifyjs build/build.js > build/build.min.js',
              ' && touch build/build.css',
              ' && uglifycss build/build.css > build/build.min.css'
            ].join('');

            child_process.exec(command, {
              
            }, function(error, stdout, stderr){

              console.log('-------------------------------------------');
              console.dir(error);
              if(error){
                res.statusCode = 500;
                res.send(error);
              }
              else{
                res.sendfile(basefolder + '/build/build' + (debug ? '' : '.min') + '.js');
              }
              
            })
          }

          if(config.development_folder){
            fs.stat(config.development_folder + '/' + repo, function(error, stat){

              if(error){
                res.statusCode = 404;
                res.send('not found');
                return;
              }
              
              if(stat){
                run_build(copy_local());
              }
              else{
                if(!git_ok()){
                  res.statusCode = 404;
                  res.send('not found');
                }
                else{
                  run_build(git_clone());  
                }
                
              }
            })
          }
          else{
            if(!git_ok()){
              res.statusCode = 404;
              res.send('not found');
            }
            else{
              run_build(git_clone());  
            }
          }
        }
        
      })
    }
  }
}