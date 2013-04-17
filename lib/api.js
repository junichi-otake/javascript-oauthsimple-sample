if( typeof( grJs ) !== 'undefined' ){
	grJs.api ={
		signedGet: function ( url, params, signatures, callback ){
			$.ajax({
				type:"GET",
				url: OAuthSimple().sign({
					action: "GET",
					path : url,
					parameters : params,
					signatures: signatures
				}).signed_url,
				cache: true,
				beforeSend : function( xhr ){
					xhr.setRequestHeader("If-Modified-Since", "Thu, 01 Jun 1970 00:00:00 GMT");
				},
				success: function(data){
					callback(data);
				},
				error: function(data){
					callback(data, 1);
				}
			});
		},
		signedPost: function( url, postParams, signatures, callback ){
			postParams.rand = (new Date).getTime();
			var params = {};
			for( pname in postParams ){
				if( !pname.match(/oauth/) ){
					params[pname] = postParams[pname];
				}
			}
			var auth_header = OAuthSimple().getHeaderString({
				action: "POST",
				path : url,
				parameters : postParams,
				signatures: signatures
			}).replace(/" /g,'" ,');
			console.log(auth_header);
			console.log(postParams);
			$.ajax({
				type:"POST",
				url: url,
				data: params,
				cache: true,
				beforeSend : function( xhr ){
					xhr.setRequestHeader("Authorization", auth_header);
					xhr.setRequestHeader("If-Modified-Since", "Thu, 01 Jun 1970 00:00:00 GMT");
				},
				success: function(data){
					callback(data);
				},
				error: function(data){
					callback(data, 1);
				}
			});
		},
		google:{
			get: function( access_token, url, params, callback){
				$.ajax({
					type:"GET",
					url:url ,
					data:params,
					cache: true,
					beforeSend : function( xhr ){
						xhr.setRequestHeader("If-Modified-Since", "Thu, 01 Jun 1970 00:00:00 GMT");
						xhr.setRequestHeader("Authorization", "Bearer "+access_token);
						// xhr.setRequestHeader("Authorization", "OAuth "+access_token);
					},
					success: function(data){
						if( typeof( data.error ) !== 'undefined' ){
							callback( data );
						}else{
							callback( data, false );
						}
					},
					error: function(data){
						callback( data, 1 );
						// console.log(data);
					}
				});
			},
			url:{
				profile: 'https://www.googleapis.com/oauth2/v1/userinfo',
				plusme: 'https://www.googleapis.com/plus/v1/people/me',
				tokeninfo: 'https://www.googleapis.com/oauth2/v1/tokeninfo'
			},
			scope: 'https://www.googleapis.com/auth/plus.me https://www.googleapis.com/auth/userinfo.profile',
			getTokenInfo:function( access_token, callback ){
			var url = grJs.api.google.url.tokeninfo;
			var params = {access_token:access_token};
			grJs.api.google.get( access_token, url, params, 
													function(data, error){
														callback(data, error);
													});
			},
			getProfile:function( access_token, callback ){
				// var url = grJs.api.google.url.tokeninfo;
				//  var url = grJs.api.google.url.profile;
				var url = grJs.api.google.url.plusme;
				//.replace(/{user_id}/, user_id);
				var params =  {access_token:access_token};
				params = {};
				grJs.api.google.get( access_token, url, params, 
														function(data, error){
															if( typeof(error) === 'undefined' || !error ){
																// setData
																var profile = {
																	id: data.id,
																	name: data.displayName,
																	image: data.image.url,
																	screen_name: data.nickname,
																	url: data.url
																};
																chrome.extension.sendRequest({type: "saveAuthData", params:{domain:"google", id: data.id, auth:{access_token:access_token}, profile: profile }}, function(response) {});
															}else{
																console.log(error);
																grJs.util.message.showTmpo('connect failed');
																chrome.extension.sendRequest({type: "saveAuthData", params:false}, function(response) {});
															}
														});
			}
		},
		twitter:{
			url:{
				search: 'http://search.twitter.com/search.json',
				profile: 'https://api.twitter.com/1/users/show.json', //?user_id={user_id}&include_entities=true'
				update: 'https://api.twitter.com/1/statuses/update.json',
				destroy: 'https://api.twitter.com/1/statuses/destroy/{id}.json',
				retweet: 'https://api.twitter.com/1/statuses/retweet/{id}.json',
				user_timeline: 'https://api.twitter.com/1/statuses/user_timeline.json',
				home_timeline: 'https://api.twitter.com/1/statuses/home_timeline.json'
			}, 
				getHomeTimeline: function ( p, oauth, callback ){
					grJs.api.twitter.getTimeline( grJs.api.twitter.url.home_timeline , p , oauth, callback );
				},
				getUserTimeline: function ( p, oauth, callback ){
					grJs.api.twitter.getTimeline( grJs.api.twitter.url.user_timeline , p , oauth, callback );
				},
				getSearchTimeline: function ( p, oauth, callback ){
					grJs.api.twitter.getTimeline( grJs.api.twitter.url.search , p , oauth, callback );
				},
				getTimeline: function( api, p, oauth, callback ){
					// https://api.twitter.com/1/statuses/user_timeline.json?include_entities=true&include_rts=true&screen_name=twitterapi&count=2
					var sig = grJs.auth.consumer.twitter;
					sig.access_token = oauth.oauth_token;
					sig.access_secret = oauth.oauth_token_secret;
					var params = {count:100};
					if( typeof(p.count) !== 'undefined'){
						params.count = p.count;
					}
					if( typeof(p.user_id) !== 'undefined'){
						params.user_id = p.user_id;
					}
					if( typeof(p.result_type) !== 'undefined'){
						params.result_type = p.result_type;
					}
					if( typeof(p.rpp) !== 'undefined'){
						params.rpp = p.rpp;
					}
					if( typeof(p.q) !== 'undefined'){
						params.q = p.q;
					}
					if( typeof(p.screen_name) !== 'undefined'){
						params.screen_name = p.screen_name;
					}
					if( typeof(p.since_id) !== 'undefined'){
						params.since_id = p.since_id;
					}else if( typeof( p.max_id) !== 'undefined' ){
						params.max_id = p.max_id;
					}
					if(typeof( p.include_entities ) !== 'undefined' ) params.include_entities = p.include_entities;
						if(typeof( p.include_rts ) !== 'undefined' ) params.include_rts = p.include_rts;
							grJs.api.signedGet( api, params, sig , callback );
				},
				retweet: function( id, oauth, callback ){
					var sig = grJs.auth.consumer.twitter;
					sig.access_token = oauth.oauth_token;
					sig.access_secret = oauth.oauth_token_secret;
					grJs.api.signedPost( grJs.api.twitter.url.retweet.replace(/{id}/,id), {}, sig , callback );
				},
				destroy: function( id, oauth, callback ){
					var sig = grJs.auth.consumer.twitter;
					sig.access_token = oauth.oauth_token;
					sig.access_secret = oauth.oauth_token_secret;
					grJs.api.signedPost( grJs.api.twitter.url.destroy.replace(/{id}/,id), {}, sig , callback );
				},
				update: function( params, oauth, callback ){
					// status=Maybe%20he%27ll%20finally%20find%20his%20keys.%20%23peterfalk&trim_user=true&include_entities=true
					if( params.status.length < 4 ){
						return false;
					}
					if( params.status.match(/http/) && params.status.replace(/http.+/,'').length > 120 ){
						return false;
					}else if( !params.status.match(/http/) && params.status.length > 138 ){
						return false;
					}
					var sig = grJs.auth.consumer.twitter;
					sig.access_token = oauth.oauth_token;
					sig.access_secret = oauth.oauth_token_secret;
					grJs.api.signedPost( grJs.api.twitter.url.update, params, sig , callback );
					return true;
				},
				getProfile:function( user_id, oauth, callback ){
					var url = grJs.api.twitter.url.profile;
					//.replace(/{user_id}/, user_id);
					var sig = grJs.auth.consumer.twitter;
					sig.access_token = oauth.oauth_token;
					sig.access_secret = oauth.oauth_token_secret;
					var params =  {user_id: user_id, include_entities: "false" };
					grJs.api.signedGet( url, params, sig , callback );
				}
		}

	};
	grJs.auth = {
		url:{
			twitter:{
				request: 'https://api.twitter.com/oauth/request_token',
					authorize: 'https://api.twitter.com/oauth/authorize',
						access: 'https://api.twitter.com/oauth/access_token'
			},
				google:{
					authorize: 'https://accounts.google.com/o/oauth2/auth',
						callback: 'http://auth.socialic.net/app/shout/google/callback'
				}
		},
		consumer:{
			twitter:{
				api_key: '',
				shared_secret: ''
			},
			google:{
				client_id:''
			}
		},
		getSignRequest: function( url, params, signatures, callback ){
			var oauthObject = OAuthSimple().sign({
				path: url,
				parameters: params,
				signatures: signatures
			});
			return oauthObject.signed_url;
		},
		setAccessToken: function(params){
			console.log(params);
			grJs.api.google.getProfile(params.access_token);

			//  chrome.extension.sendRequest({type: "saveAuthData", params:{domain:"twitter", id: data.id, auth:oauth_data, profile: profile }}, function(response) {});
		},
		getAccessToken: function(params){
			grJs.api.signedPost( 
													grJs.auth.url.twitter.access,
													{ 
														"oauth_token" : params.oauth_token,
														"oauth_verifier" : params.oauth_verifier
													},
													{
														api_key: grJs.auth.consumer.twitter.api_key,
														shared_secret: grJs.auth.consumer.twitter.shared_secret
													},
													function(data, error){
														if( typeof( error ) !== 'undefined' ){
															console.log('error');
															console.log(data);
															return false;
														}
														console.log(data);
														if( data.match(/oauth/) ){
															var oauth_data = grJs.util.getParameters( data );
															// profile
															var url = grJs.api.twitter.getProfile( oauth_data.user_id, oauth_data,function(data, error){
																if( typeof(error) === 'undefined'){
																	// setData
																	var profile = {
																		id: data.id,
																		name: data.name,
																		image: data.profile_image_url,
																		screen_name: data.screen_name
																	};
																	chrome.extension.sendRequest({type: "saveAuthData", params:{domain:"twitter", id: data.id, auth:oauth_data, profile: profile }}, function(response) {});
																}else{
																	console.log(error);
																	console.log(data);
																}
/*
// save
// update List
console.log(response);
*/
															});
														}
													});
		},
		getRequestToken: function(service){
			try{
				if( typeof( service )==='undefined' ){
					service = 'twitter';
				}
				var params ={};
				params.rand=(new Date).getTime();
				var callback_url = location.href.replace(/\?.+/,'');
				if( service == 'google' ){
					request = grJs.auth.url.google.authorize + '?'; //'https://accounts.google.com/o/oauth2/auth'
					params = {
						response_type: 'token',
						client_id: grJs.auth.consumer.google.client_id,
						redirect_uri: grJs.auth.url.google.callback,
						scope: grJs.api.google.scope, //'https://www.googleapis.com/auth/plus.me', 
						state: 'google', // callback_url,
						approval_prompt: 'auto'
					};
					for( i in params ){
						request += i+'='+encodeURIComponent( params[i] )+'&';
					}
					location.href=request;
				}else{
					params.oauth_callback = callback_url;
					// .replace(/html\/auth.html/,'main.html');
					// params.oauth_callback = 'http://socialic.net/app/shout/twitter/callback';
					var oauthObject = OAuthSimple().sign({
						path: grJs.auth.url.twitter.request,
						parameters: params,
						signatures:{
							api_key: grJs.auth.consumer.twitter.api_key,
							shared_secret: grJs.auth.consumer.twitter.shared_secret
						}
					});
					console.log("getRequestToken");
					console.log(oauthObject.signed_url);
					$.ajax({
						url: oauthObject.signed_url,
						cache: true,
						success: function(data){
							console.log(data);
							if( data.match(/oauth_token/) ){
								location.href= grJs.auth.url.twitter.authorize+'?'+data;
							}else{
								console.log('error');
							}
						}
					});
				}
			}catch(e){
				console.log(e);
			}
			// location.href=oauthObject.signed_url;
		}
	};
}
