angular
  .module('componentloader', [
    
  ])


  /*
  
    setup the dynamic module loader
    
  */
  .config(function($compileProvider){
  
    $digger.directive = function(){
      $compileProvider.directive.apply(null,arguments);
    }
    
  })


  .service('AsyncScriptLoader',function($q,$rootScope){
    
    var scripts = {};
    
    var loadScriptAsync = function(src){
      if(!scripts[src]){
        var deferred = $q.defer();
        
        var script = document.createElement('script'), run = false;
        script.type = 'text/javascript';
        script.src = src;
        
        script.onload = script.onreadystatechange = function() {
          if( !run && (!this.readyState || this.readyState === 'complete') ){
            run = true;
            deferred.resolve('Script ready: ' + src);
            $rootScope.$digest();
          }
        };
        document.body.appendChild(script);
        
        scripts[src] = deferred.promise;
      }
      
      return scripts[src];
    }
    
    return {
      load:loadScriptAsync
    };
    
  })


  /*
  
    the loader itself

    this is a client side angular proxy for components living on github

    we connect to the core api on /reception/component which the HTTP intercepts

    it downloads and builds the component on the server

    the module.exports must be the string we compile into the field

    it can register directives on window.$diggercomponents.directive('name', function(){})
    
  */
  .service('DiggerComponentLoader',function(AsyncScriptLoader,$q,$rootScope,$http){
    
    var baseurl = $digger.config.diggerurl + '/reception/component';
    
    var components = {};
    
    var loadComponent = function(name){
      if(!components[name]){

        // hit the top for the javascript - this will 302 to the actual code once built
        var javascript_src = baseurl + '/' + name;
        var parts = name.split('/');
        var repo = parts.pop();
        var modulename = name.replace(/\//g, '-');

        // once it has built - we know the css is this path (thank you component : )
        var css_src = javascript_src + '/build/build' + ($digger.config.debug ? '' : '.min') + '.css';

        javascript_src += ($digger.config.debug ? '?debug=y' : '')

        var deferred = $q.defer();

        AsyncScriptLoader.load(javascript_src).then(function(){
            var link = document.createElement('link');
            link.setAttribute('rel', 'stylesheet');
            link.setAttribute('type', 'text/css');
            link.setAttribute('href', css_src);
            document.getElementsByTagName('head')[0].appendChild(link);

            // the module will return the HTML
            // it has registered directives with window.$diggercomponents already
            var module = window.require(repo);
            var html = '';

            // the module is angular markup
            if(typeof(module)==='string'){
              html = module;
            }
            // the module has blueprints and markup
            else{
              html = module.html;
            }

            deferred.resolve(html);
        })

        components[name] = deferred.promise;
      }

      return components[name];
    }
    
    return {
      load:loadComponent
    };
    
  })



  /*
  
    the directive that triggers us loading the component remotely and injecting / compiling it when done
    
  */
  .directive('diggerComponent', function(DiggerComponentLoader, $compile){
    return {
      restrict:'EA',
      scope:{
        name:'=',
        field:'=',
        container:'=', 
        model:'=',
        fieldname:'=',
        readonly:'='
      },
      replace:true,
      template:'<div></div>',
      controller:function($scope){

        // we load the component from the server
        // once it has done - require the component (it has registered via the script load)
        $scope.$watch('name', function(name){

          if(!name){
            return;
          }


          if($digger.config.debug){
            console.log('-------------------------------------------');
            console.log('compiling component: ' + name);
          }
          DiggerComponentLoader.load(name).then(function(html){
            if($digger.config.debug){
              console.log('-------------------------------------------');
              console.log(name + ' LOADED');
              console.dir(html);
            }

            $scope.component_html = html;
            
          }, function(error){
            if($digger.config.debug){
              console.log('-------------------------------------------');
              console.log('component error!');
              console.dir(error);
            }
          })
        })

        

      },
      link:function($scope, elem, $attrs){

        // this is changed once we have loaded the remote component
        $scope.$watch('component_html', function(html){
          var widget = $compile(html)($scope);
          elem.html('');
          elem.append(widget);
        })
      }
    }
  })
