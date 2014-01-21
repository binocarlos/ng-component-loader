angular
  .module('componentloader', [
    
  ])
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
