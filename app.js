var tmi = require("tmi.js");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const TWITCH_ID=process.env.twitch-id;
const TWITCH_OAUTH=process.env.twitch-oauth;
const OSU_API_KEY=process.env.osu-api-key;
const IRC_PASS=process.env.irc-pass;
var canales=["#gaby12521", "#azer"];
var contador=0;
var isTimedOut=inicializarTimeouts(canales);
var cooldown=0;
var isSourPlsTimedOut=inicializarTimeouts(canales);
var usuarioRequestId=-1;
var ultimasDiez=[];
var options =
{
    options:
	{
        debug: true
    },
    connection:
	{
        reconnect: true
    },
    identity:
	{
        username: "gaby12521",
        password: "oauth:"+TWITCH_OAUTH
    },
    channels: canales
};
var client = new tmi.client(options);
var ircBot = iniciarOsuIrc();
client.connect().then(function()
{
	//notificarSeguidores();
	client.on("message", function (canal, userstate, message, self)
	{
		var timeout=0;
		var userName=userstate.username;
		var user=userstate["display-name"];
		if(canal=="#azer" || canal=="#gaby12521")
		{
			cooldown=0;
		}
		else
		{
			cooldown=5000;
		}
		if(userName=="gaby12521")
		{
			timeout=1000;
		}
		if(userName=="yowzar")
		{
			contador++;
		}
		setTimeout(function()
		{
			if(!isTimedOut[canal])
			{
				if(message.startsWith("!roll"))
				{
					var dice=Math.floor(Math.random()*101);
					if(dice==0)
					{
						client.say(canal, user+", you rolled "+dice.toString()+" OMEGALUL");
					}
					else if(dice<10)
					{
						client.say(canal, user+", you rolled "+dice.toString()+" LUL");
					}
					else if(dice<50)
					{
						client.say(canal, user+", you rolled "+dice.toString()+" azerFROST");
					}
					else if(dice<90)
					{
						client.say(canal, user+", you rolled "+dice.toString()+" SeemsGood");
					}
					else if(dice<100)
					{
						client.say(canal, user+", you rolled "+dice.toString()+"! PogChamp");
					}
					else
					{
						client.say(canal, user+", you rolled "+dice.toString()+"!!! PogChamp PogChamp PogChamp PogChamp PogChamp");
					}
				}
				else if(message.startsWith("!yowzar"))
				{
					client.say(canal, "yowzar has talked "+contador+" times in chat azerFROST");
				}
				else if(message.startsWith("!whatis"))
				{
					var query=message.split(" ");
					var newQuery="";
					for(var i=1;i<query.length;i++)
					{
						newQuery+=query[i].charAt(0).toUpperCase() + query[i].slice(1).toString().toLowerCase();
						if(i+1==query.length)
						{
							break;
						}
						else
						{
							newQuery+="_";
						}
					}
					client.say(canal, "https://en.wikipedia.org/wiki/"+newQuery);
				}
				else if(message.startsWith("!whats"))
				{
					var query=message.split(" ");
					var newQuery="";
					for(var i=1;i<query.length;i++)
					{
						newQuery+=query[i].charAt(0).toUpperCase() + query[i].slice(1).toString().toLowerCase();
						if(i+1==query.length)
						{
							break;
						}
						else
						{
							newQuery+="%20";
						}
					}
					client.say(canal, "https://www.urbandictionary.com/define.php?term="+newQuery);
				}
				else if(message.startsWith("!fu"))
				{
					var query=message.split(" ");
					if(query.length==1)
					{
						client.say(canal, "Hey "+user+" azerFROST 🖕");
					}
					else
					{
						client.say(canal, "Hey "+message.substring(4)+" azerFROST 🖕");
					}
				}
				else if(message.startsWith("!nani"))
				{
					var query=message.split(" ");
					var newQuery="";
					for(var i=1;i<query.length;i++)
					{
						newQuery+=encodeURIComponent(query[i].toLowerCase());
						if(i+1==query.length)
						{
							break;
						}
						else
						{
							newQuery+="%20";
						}
					}
					client.say(canal, "http://jisho.org/search/"+newQuery);
				}
				else if(message.startsWith("!maps"))
				{
					client.say(canal, "https://www.google.com/maps azerFROST");
				}
				else if(message.startsWith("!np"))
				{
					client.say(canal, "Current map: https://osu.ppy.sh/b/1033716");
				}
				else if(message.startsWith("!mayday"))
				{
					client.say(canal, "Unfortunately, Azer has already played the Mayday map and won't play it right now. Thanks for requesting though! azerHappy");
				}
				else if(message.startsWith("!maydont"))
				{
					client.say(canal, "https://clips.twitch.tv/BreakableSecretiveJalapenoRitzMitz?tt_content=chat_card&tt_medium=twitch_chat");
				}
				else if(message.includes("SourPls"))
				{
					if(!isSourPlsTimedOut)
					{
						client.say(canal, "SourPls");
						isSourPlsTimedOut=true;
						setTimeout(function()
						{
							isSourPlsTimedOut=false;
						}, 10000);
					}
				}
			}
			isTimedOut[canal]=true;
			setTimeout(function()
			{
				isTimedOut[canal]=false;
			}, cooldown);
			if(!esASCII(user))
			{
				user=userstate.username;
			}
			if(message.startsWith("https://osu.ppy.sh/b/"))
			{
				var mapId=message.split("/")[4].split("&")[0].split(" ")[0];
				comenzarRequest(user, canal, mapId, "b", message);
			}
			else if(message.startsWith("https://osu.ppy.sh/s/"))
			{
				var mapId=message.split("/")[4].split("&")[0].split(" ")[0];
				comenzarRequest(user, canal, mapId, "s", message);
			}
			else if(message.startsWith("https://osu.ppy.sh/beatmapsets/"))
			{
				if(message.split("/").length<6)
				{
					var mapId=message.split("/")[4].split("#")[0].split(" ")[0];
					comenzarRequest(user, canal, mapId, "s", message);
				}
				else if(message.split("/").length==6)
				{
					var mapId=message.split("/")[5].split(" ")[0];
					comenzarRequest(user, canal, mapId, "b", message);
				}
				else
				{
					var mapId=message.split("/")[6].split(" ")[0];
					comenzarRequest(user, canal, mapId, "b", message);
				}
			}
			else if(message.startsWith("https://osu.ppy.sh/p/beatmap?"))
			{
				var mapId=message.split("b=")[1].split("&")[0].split(" ")[0];
				comenzarRequest(user, canal, mapId, "b", message);
			}
		}, timeout);
	});
});
function notificarSeguidores()
{
	var url="https://api.twitch.tv/helix/users/follows?to_id=&first=5";
	var listaSeguidores=["primerIteracion"];
	var nuevosSeguidores=[];
	setInterval(function()
	{
		var xhttp=new XMLHttpRequest();
		xhttp.open("GET", url, true);
		xhttp.setRequestHeader("Client-ID", TWITCH_ID);
		xhttp.send();
		xhttp.onreadystatechange=function()
		{
			//console.log(xhttp);
			if(xhttp.readyState==4)
			{
				if(xhttp.status==200)
				{
					var respuesta=JSON.parse(xhttp.responseText);
					nuevosSeguidores=[];
					if(listaSeguidores[0]=="primerIteracion")
					{
						listaSeguidores=respuesta.data;
					}
					else
					{
						for(var i=0;i<listaSeguidores.length;i++)
						{
							if(listaSeguidores[0].from_id==respuesta.data[i].from_id)
							{
								break;
							}
							else
							{
								nuevosSeguidores.push(respuesta.data[i]);
							}
						}
						listaSeguidores=respuesta.data;
						var j=0;
						if(nuevosSeguidores.length>0)
						{
							var loopArray = function(nuevosSeguidoresParam)
							{
								var xhttp2=new XMLHttpRequest();
								xhttp2.open("GET", "https://api.twitch.tv/helix/users?id="+nuevosSeguidoresParam[j].from_id, true);
								xhttp2.setRequestHeader("Client-ID", TWITCH_ID);
								xhttp2.send();
								xhttp2.onreadystatechange=function()
								{
									if(xhttp2.readyState==4 && xhttp2.status==200)
									{
										var respuesta2=JSON.parse(xhttp2.responseText);
										customAlert(respuesta2.data[0].display_name, function()
										{
											j++;
											if(j < nuevosSeguidoresParam.length)
											{
												loopArray(nuevosSeguidoresParam);   
											}
										});
									}
								}
							}
							loopArray(nuevosSeguidores);
							function customAlert(nombre, callback)
							{
								client.say(canales[0], nombre+" is now following Azer azerLove");
								setTimeout(callback, 1000);
							}
						}
					}
				}
				else
				{
					console.log(xhttp);
				}
			}
		}
	}, 10000);
}
function requestBeatmap(id, callback)
{
	var url="https://osu.ppy.sh/api/get_beatmaps?k="+OSU_API_KEY+"&"+id;
	var xhttp=new XMLHttpRequest();
	xhttp.open("GET", url, true);
	xhttp.send();
	xhttp.onreadystatechange=function()
	{
		if(xhttp.readyState==4)
		{
			if(xhttp.status==200)
			{
				var respuesta=JSON.parse(xhttp.responseText);
				if(respuesta.length==0)
				{
					return;
				}
				var map=respuesta[0];
				if(id.startsWith("s"))
				{
					for(var i=1;i<respuesta.length;i++)
					{
						if(respuesta[i].difficultyrating>map.difficultyrating)
						{
							map=respuesta[i];
						}
					}
				}
				if(!validarRepetido(map.beatmap_id))
				{
					return;
				}
				var stars=parseFloat(map.difficultyrating).toFixed(2);
				var mapLength=parseLength(map.total_length);
				callback(parseStatus(map.approved)+" [https://osu.ppy.sh/b/"+map.beatmap_id+" "+map.artist+" - "+map.title+" ["+map.version+"]"+"] by "+map.creator+" (★: "+stars+", \u23F0: "+mapLength+", BPM: "+map.bpm+", CS: "+map.diff_size+", AR: "+map.diff_approach+", OD: "+map.diff_overall+", HP: "+map.diff_drain+")");
				//callback("[https://osu.ppy.sh/b/"+map.beatmap_id+" "+map.artist+" - "+map.title+" ["+map.version+"]"+"] by "+map.creator+" ("+parseStatus(map.approved)+") (★: "+stars+", \u23F0: "+mapLength+", BPM: "+map.bpm+", CS: "+map.diff_size+", AR: "+map.diff_approach+", OD: "+map.diff_overall+", HP: "+map.diff_drain+")");
			}
		}
	}
}
function iniciarOsuIrc()
{
	var config =
	{
		server: "irc.ppy.sh",
		port: "6667",
		userName: "G_a_b_y",
		realName: "G_a_b_y",
		nick: "G_a_b_y",
		password: IRC_PASS,
		retryCount: 0,
		sasl: false,
		debug: false
	};

	var irc = require("irc");

	var bot = new irc.Client("irc.ppy.sh", "G_a_b_y", config);
	/*bot.addListener("registered", function(message)
	{
		bot.say("G_a_b_y", "LUL");
	});*/
	bot.addListener("error", function(message)
	{
		console.log(message);
	});
	return bot;
}
function obtenerIdOsu(usuario, callback)
{
	var url="https://osu.ppy.sh/api/get_user?k="+OSU_API_KEY+"&u="+usuario;
	var xhttp=new XMLHttpRequest();
	xhttp.open("GET", url, true);
	xhttp.send();
	xhttp.onreadystatechange=function()
	{
		//console.log(xhttp);
		if(xhttp.readyState==4)
		{
			if(xhttp.status==200)
			{
				var infoUsuario=JSON.parse(xhttp.responseText)[0];
				callback(infoUsuario.user_id);
			}
		}
	}
}
function parseLength(lengthSecs)
{
	var minutos=Math.floor(lengthSecs/60);
	var segundos=lengthSecs-minutos*60;
	return minutos+":"+("0"+segundos).slice(-2);
}
function comenzarRequest(user, canal, mapId, tipo, mensaje)
{
	requestBeatmap(tipo+"="+mapId, function(datos)
	{
		/*var request=user+" \u27a4 "+datos;
		if(mensaje.split(" ").length>1)
		{
			request+=" - Note: "+(mensaje.substring(mensaje.split(" ")[0].length+1));
		}*/
		var request=datos+" - "+user;
		if(mensaje.split(" ").length>1)
		{
			request+=": "+(mensaje.substring(mensaje.split(" ")[0].length+1));
		}
		ircBot.say(parseUsuarioOsu(canal), request);
	});
}
function validarRepetido(id)
{
	for(var i=0;i<ultimasDiez.length;i++)
	{
		if(id==ultimasDiez[i])
		{
			return false;
		}
	}
	if(ultimasDiez.length==10)
	{
		var auxiliar=ultimasDiez.slice(1);
		ultimasDiez=auxiliar;
	}
	ultimasDiez.push(id);
	return true;
}
function parseStatus(estado)
{
	switch(estado)
	{
		case "-2":
		{
			return "✝";
		}
		case "-1":
		{
			return "☁";
		}
		case "0":
		{
			return "☁";
		}
		case "1":
		{
			//return "★";
			return "︽";
		}
		case "2":
		{
			return "⛰";
		}
		case "3":
		{
			return "✓";
		}
		case "4":
		{
			return " ♥ ";
		}
		default:
		{
			return "N/A";
		}
	}
}
function parseUsuarioOsu(canalTwitch)
{
	var canal=canalTwitch.substring(1);
	switch(canal)
	{
		case "azer":
		{
			return "Azer";
		}
		case "abyssal":
		{
			return "Abyssal";
		}
		case "gaby12521":
		{
			return "G_a_b_y";
		}
		default:
		{
			return null;
		}
	}
}
function esASCII(cadena)
{
	return /^[\x00-\x7F]*$/.test(cadena);
}
function inicializarTimeouts(canales)
{
	var timeouts={};
	for(var i=0;i<canales.length;i++)
	{
		Object.defineProperty(timeouts, canales[i],
		{
			enumerable: true,
			configurable: true,
			writable: true,
			value: false
		});
	}
	return timeouts;
}