﻿var tmi = require("tmi.js");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var fs = require('fs');
var DOMParser=require("dom-parser");
const TWITCH_ID=process.env.twitchid;
const TWITCH_OAUTH=process.env.twitchoauth;
const OSU_API_KEY=process.env.osuapikey;
const IRC_PASS=process.env.ircpass;
const URL=process.env.rutabase;
const WEB_URL=process.env.rutaweb;
const IP=process.env.ip;
const PUERTO=process.env.puerto;
const DEFAULT_TWITCH=process.env.defaulttwitch;
const DEFAULT_OSU=process.env.defaultosu;
var usuarios=obtenerUsuarios();
var canales=obtenerCanales(usuarios);
var blacklisted=obtenerBlacklisted();
var contadorYowzar=obtenerContadorYowzar();
var isTimedOut=inicializarTimeouts(canales);
var cooldown=0;
var isSourPlsTimedOut=inicializarTimeouts(canales);
var usuarioRequestId=-1;
var estaActivo={};
var intervalos={};
var ultimasDiez=inicializarRepetidos(canales, estaActivo);
var tipoDisplay=obtenerTipoDisplay(canales);
var modoComando=obtenerModoComando(canales);
var blacklistedDisplay={};
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
        username: DEFAULT_TWITCH,
        password: "oauth:"+TWITCH_OAUTH
    },
    channels: canales
};
var client = new tmi.client(options);
var ircBot = iniciarOsuIrc();
//------------express----------------
var express=require("express");
var appExpress=express();
var nunjucks=require("nunjucks");
appExpress.set("view engine", "html");
appExpress.set("views", __dirname + "/views");
var env=nunjucks.configure("views", 
{
	autoescape:true,
	express:appExpress
});
appExpress.get("/blacklisted/:osu", function(request, response)
{
	var mensaje="";
	var lista=[];
	var usuarioOsu=request.params.osu;
	var usuarioTwitch=parseUsuarioTwitch(usuarioOsu);
	if(blacklistedDisplay[usuarioTwitch]==undefined)
	{
		mensaje="The specified user isn't using this bot or hasn't blacklisted any beatmap yet. ";
		mensaje+="If that's not the case, try using the \"!blacklisted\" command from this user's Twitch channel and try again.";
	}
	else
	{
		lista=blacklistedDisplay[usuarioTwitch].slice();
		for(var i=0;i<lista.length;i++)
		{
			if(lista[i].nombre==undefined)
			{
				lista.splice(i, 1);
				i--;
			}
		}
		if(blacklistedDisplay[usuarioTwitch].length==0)
		{
			mensaje=usuarioOsu+" doesn't have any blacklisted beatmap at the moment."
		}
		else
		{
			if(blacklistedDisplay[usuarioTwitch].length==1)
			{
				mensaje=usuarioOsu+" has blacklisted the following beatmap:";
			}
			else
			{
				mensaje=usuarioOsu+" has blacklisted the following beatmaps:";
			}
			lista.sort(function(b1, b2)
			{
				return b1.nombre.localeCompare(b2.nombre);
			});
			var sets=[];
			for(var i=0;i<lista.length;i++)
			{
				sets.push({nombre:lista[i].nombre, dificultades:[]});
				sets[i].dificultades.push({id:lista[i].id, version:lista[i].version, dificultad:lista[i].dificultad});
				for(var j=i+1;j<lista.length;j++)
				{
					if(lista[i].set==lista[j].set)
					{
						sets[i].dificultades.push({id:lista[j].id, version:lista[j].version, dificultad:lista[j].dificultad});
						lista.splice(j, 1);
						j--;
					}
				}
				sets[i].dificultades.sort(function(d1, d2)
				{
					return d1.dificultad-d2.dificultad;
				});
			}
		}
	}
	response.render("blacklistedView", {mensaje:mensaje, sets:sets});
});
appExpress.get("/commands", function(request, response)
{
	response.render("commandsList");
});
appExpress.listen(PUERTO, IP);
//------------fin express------------
client.connect().then(function()
{
	//notificarSeguidores();
	client.on("message", function (canal, userstate, message, self)
	{
		var timeout=0;
		var userName=userstate.username;
		var user=userstate["display-name"];
		if(canal=="#"+DEFAULT_TWITCH)
		{
			cooldown=0;
		}
		else
		{
			cooldown=10000;
		}
		if(userName==DEFAULT_TWITCH)
		{
			timeout=1000;
		}
		if(userName=="yowzar")
		{
			sumarContadorYowzar();
		}
		setTimeout(function()
		{
			if(!isTimedOut[canal])
			{
				var timeoutActual=false;
				if(modoComando[canal]==undefined || modoComando[canal]!="No Additionals")
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
						timeoutActual=true;
					}
					else if(message.startsWith("!yowzar"))
					{
						client.say(canal, "yowzar has talked "+contadorYowzar+" times in chat azerFROST");
						timeoutActual=true;
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
						timeoutActual=true;
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
						timeoutActual=true;
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
						timeoutActual=true;
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
						timeoutActual=true;
					}
					else if(message.startsWith("!maps"))
					{
						client.say(canal, "https://www.google.com/maps azerFROST");
						timeoutActual=true;
					}
					else if(message.startsWith("!np"))
					{
						client.say(canal, "Current map: https://osu.ppy.sh/b/1033716");
						timeoutActual=true;
					}
					else if(message.startsWith("!mayday"))
					{
						client.say(canal, "Unfortunately, "+parseUsuarioOsu(canal)+" has already played the Mayday map and won't play it right now. Thanks for requesting though! azerHappy");
						timeoutActual=true;
					}
					else if(message.startsWith("!maydont"))
					{
						client.say(canal, "https://clips.twitch.tv/BreakableSecretiveJalapenoRitzMitz?tt_content=chat_card&tt_medium=twitch_chat");
						timeoutActual=true;
					}
					else if(message.startsWith("!bible"))
					{
						var xhttp=new XMLHttpRequest();
						xhttp.open("GET", "http://www.sandersweb.net/bible/verse.php", true);
						xhttp.send();
						xhttp.onreadystatechange=function()
						{
							if(xhttp.readyState==4 && xhttp.status==200)
							{
								var parser=new DOMParser();
								var bibleDom=parser.parseFromString(xhttp.responseText);
								var versiculo=bibleDom.getElementsByTagName("h2")[0].textContent.replace(" (Listen)", "");
								var texto="🙏 \""+parseVerse(bibleDom.getElementsByClassName("esv-text")[0].innerHTML)+"\" - "+versiculo+" 🙏";
								client.say(canal, texto);
								timeoutActual=true;
							}
						}
					}
					else if(message.startsWith("!kms"))
					{
						client.say(canal, "/timeout "+userName+" 1");
						client.say(canal, "@"+user+" 🔫 azerHappy");
						timeoutActual=true;
					}
					else if(message.includes("SourPls"))
					{
						if(!isSourPlsTimedOut[canal])
						{
							client.say(canal, "SourPls");
							isSourPlsTimedOut[canal]=true;
							setTimeout(function()
							{
								isSourPlsTimedOut[canal]=false;
							}, 10000);
						}
					}
				}
				if(message.startsWith("!blacklisted"))
				{
					cargarBlacklistedDisplay(canal, user);
					timeoutActual=true;
				}
				if(message.startsWith("!commands"))
				{
					client.say(canal, "@"+user+" "+WEB_URL+"/commands");
					timeoutActual=true;
				}
				if(timeoutActual)
				{
					isTimedOut[canal]=true;
					setTimeout(function()
					{
						isTimedOut[canal]=false;
					}, cooldown);
				}
			}
			if(userName==DEFAULT_TWITCH)
			{
				if(message.startsWith("!adduser"))
				{
					var query=message.split(" ");
					var twitch="#"+query[1];
					var osu=query[2];
					agregarUsuario(twitch, osu).then(function(data)
					{
						client.say(canal, "User "+query[1]+" has been successfully added.");
					}).catch(function(error)
					{
						console.log(error);
						client.say(canal, "The specified user couldn't be added.");
					});
				}
				else if(message.startsWith("!removeuser"))
				{
					var query=message.split(" ");
					var usuario="#"+query[1];
					eliminarUsuario(usuario).then(function(data)
					{
						if(usuario!=canal)
						{
							client.say(canal, "User "+query[1]+" has been successfully removed.");
						}
					}).catch(function(error)
					{
						console.log(error);
						client.say(canal, "The specified user couldn't be removed.");
					});
				}
				else if(message.startsWith("!checkstatus"))
				{
					mostrarEstado();
				}
				else if(message.startsWith("!transferbl"))
				{
					var query=message.split(" ");
					var canalDesde="#"+query[1];
					var canalHasta="#"+query[2];
					transferirBlacklisted(canalDesde, canalHasta, function(error)
					{
						if(error)
						{
							console.log(error);
							client.say(canal, "The blacklisted beatmaps couldn't be transfered.");
							return;
						}
						client.say(canal, "The blacklisted beatmaps were transfered successfully.");
					});
				}
				else if(message.startsWith("!removebl"))
				{
					var query=message.split(" ");
					var canalQuery="#"+query[1];
					eliminarUsuarioBlacklisted(canalQuery, function(error)
					{
						if(error)
						{
							console.log(error);
							client.say(canal, "The specified user couldn't be removed from blacklists.");
							return;
						}
						client.say(canal, "User "+query[1]+" has been removed from blacklists successfully.");
					});
				}
			}
			if("#"+userName==canal)
			{
				if(message.startsWith("!blacklist ") || message.startsWith("!bl "))
				{
					escucharPM(parseUsuarioOsu(canal), message, null);
				}
				else if(message.startsWith("!whitelist ") || message.startsWith("!wl "))
				{
					escucharPM(parseUsuarioOsu(canal), message, null);
				}
				else if(message.startsWith("!changedisplay"))
				{
					escucharPM(parseUsuarioOsu(canal), message, null);
				}
				else if(message.startsWith("!enablecommands"))
				{
					cambiarModoComando(canal, "All");
				}
				else if(message.startsWith("!disablecommands"))
				{
					cambiarModoComando(canal, "No Additionals");
				}
			}
			if(!esASCII(user))
			{
				user=userstate.username;
			}
			if(message.startsWith("https://osu.ppy.sh/b/") || message.startsWith("https://old.ppy.sh/b/"))
			{
				var mapId=message.split("/")[4].split("&")[0].split(" ")[0].split("+")[0];
				comenzarRequest(user, canal, mapId, "b", message);
			}
			else if(message.startsWith("osu.ppy.sh/b/") || message.startsWith("old.ppy.sh/b/"))
			{
				var mapId=message.split("/")[2].split("&")[0].split(" ")[0].split("+")[0];
				comenzarRequest(user, canal, mapId, "b", message);
			}
			else if(message.startsWith("https://osu.ppy.sh/s/") || message.startsWith("https://old.ppy.sh/s/"))
			{
				var mapId=message.split("/")[4].split("&")[0].split(" ")[0].split("+")[0];
				comenzarRequest(user, canal, mapId, "s", message);
			}
			else if(message.startsWith("osu.ppy.sh/s/") || message.startsWith("old.ppy.sh/s/"))
			{
				var mapId=message.split("/")[2].split("&")[0].split(" ")[0].split("+")[0];
				comenzarRequest(user, canal, mapId, "b", message);
			}
			else if(message.startsWith("https://osu.ppy.sh/beatmapsets/"))
			{
				if(message.split("/").length<6)
				{
					var mapId=message.split("/")[4].split("#")[0].split(" ")[0].split("+")[0];
					comenzarRequest(user, canal, mapId, "s", message);
				}
				else if(message.split("/").length==6)
				{
					var mapId=message.split("/")[5].split(" ")[0].split("+")[0];
					comenzarRequest(user, canal, mapId, "b", message);
				}
				else
				{
					var mapId=message.split("/")[6].split(" ")[0].split("+")[0];
					comenzarRequest(user, canal, mapId, "b", message);
				}
			}
			else if(message.startsWith("osu.ppy.sh/beatmapsets/"))
			{
				if(message.split("/").length<6)
				{
					var mapId=message.split("/")[2].split("#")[0].split(" ")[0].split("+")[0];
					comenzarRequest(user, canal, mapId, "s", message);
				}
				else if(message.split("/").length==6)
				{
					var mapId=message.split("/")[3].split(" ")[0].split("+")[0];
					comenzarRequest(user, canal, mapId, "b", message);
				}
				else
				{
					var mapId=message.split("/")[4].split(" ")[0].split("+")[0];
					comenzarRequest(user, canal, mapId, "b", message);
				}
			}
			else if(message.startsWith("https://osu.ppy.sh/p/beatmap?") || message.startsWith("osu.ppy.sh/p/beatmap?"))
			{
				var mapId=message.split("b=")[1].split("&")[0].split(" ")[0].split("+")[0];
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
function requestBeatmap(id, canal, user, callback)
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
				if(!validarBlacklisted(map.beatmap_id, canal))
				{
					client.say(canal, "@"+user+" Unfortunately, "+parseUsuarioOsu(canal)+" has blacklisted the beatmap you requested. Try requesting another beatmap azerHappy");
					return;
				}
				if(!validarRepetido(map.beatmap_id, canal))
				{
					if(canal.startsWith("#chatrooms"))
					{
						client.say(canal, "@"+user+" The beatmap you requested has been requested recently by another user. Try requesting another beatmap azerHappy");
					}
					return;
				}
				if(canal.startsWith("#chatrooms"))
				{
					client.say(canal, "@"+user+" Your request \""+map.artist+" - "+map.title+" ["+map.version+"]\""+" has been sent to "+parseUsuarioOsu(canal)+" azerHappy");
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
		userName: DEFAULT_OSU,
		realName: DEFAULT_OSU,
		nick: DEFAULT_OSU,
		password: IRC_PASS,
		retryCount: 0,
		sasl: false,
		debug: false
	};

	var irc = require("irc");

	var bot = new irc.Client("irc.ppy.sh", DEFAULT_OSU, config);
	bot.addListener("pm", escucharPM);
	bot.addListener("error", function(message)
	{
		console.log(message);
	});
	return bot;
}
function escucharPM(nick, text, message)
{
	var usuarioValido=false;
	for(var i=0;i<usuarios.length;i++)
	{
		if(usuarios[i].osu==nick)
		{
			usuarioValido=true;
			break;
		}
	}
	if(!usuarioValido)
	{
		return;
	}
	if(text.startsWith("!blacklist ") || text.startsWith("!bl "))
	{
		comenzarBlacklist(nick, text, "Blacklist");
	}
	else if(text.startsWith("!whitelist ") || text.startsWith("!wl "))
	{
		var canal=parseUsuarioTwitch(nick);
		if(blacklisted[canal]==undefined || blacklisted[canal].length==0)
		{
			ircBot.say(nick, "Whitelist failed. You don't have any blacklisted beatmap currently.");
			return;
		}
		comenzarBlacklist(nick, text, "Whitelist");
	}
	else if(text.startsWith("!changedisplay"))
	{
		var canal=parseUsuarioTwitch(nick);
		cambiarTipoDisplay(canal, text);
	}
}
function comenzarBlacklist(nick, text, comando)
{
	var query=text.split(" ");
	if(query.length==1)
	{
		return;
	}
	else if(query.length>1)
	{
		var mapa=query[1];
		var mapId="";
		var esSet=false;
		if(mapa.startsWith("https://osu.ppy.sh/b/"))
		{
			mapId=mapa.split("/")[4].split("&")[0];
		}
		else if(mapa.startsWith("https://osu.ppy.sh/s/"))
		{
			ircBot.say(nick, comando+" failed. If you want to "+comando.toLowerCase()+" a set, use the following command: \"!"+comando.toLowerCase()+" <Single beatmap link> -set\"");
			return;
		}
		else if(mapa.startsWith("https://osu.ppy.sh/beatmapsets/"))
		{
			if(mapa.split("/").length<6)
			{
				ircBot.say(nick, comando+" failed. If you want to "+comando.toLowerCase()+" a set, use the following command: \"!"+comando.toLowerCase()+" <Single beatmap link> -set\"");
				return;
			}
			else if(mapa.split("/").length==6)
			{
				mapId=mapa.split("/")[5];
			}
			else
			{
				mapId=mapa.split("/")[6];
			}
		}
		else if(mapa.startsWith("https://osu.ppy.sh/p/beatmap?"))
		{
			mapId=mapa.split("b=")[1].split("&")[0];
		}
		if(query.length>2 && query[2]=="-set")
		{
			esSet=true;
		}
		agregarBlacklisted(nick, mapId, esSet, comando);
	}
}
function obtenerIdOsu(usuario, callback)
{
	var url="https://osu.ppy.sh/api/get_user?k="+OSU_API_KEY+"&u="+usuario;
	var xhttp=new XMLHttpRequest();
	xhttp.open("GET", url, true);
	xhttp.send();
	xhttp.onreadystatechange=function()
	{
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
	requestBeatmap(tipo+"="+mapId, canal, user, function(datos)
	{
		var request;
		var separador;
		if(tipoDisplay[canal]==undefined || tipoDisplay[canal]=="Requestor Last")
		{
			request=datos+" - "+user;
			separador=": ";
		}
		else if(tipoDisplay[canal]=="Requestor First")
		{
			request=user+" \u27a4 "+datos;
			separador=" - ";
		}
		if(mensaje.split(" ").length>1)
		{
			request+=separador+(mensaje.substring(mensaje.split(" ")[0].length+1));
		}
		ircBot.say(parseUsuarioOsu(canal), request);
	});
}
function validarRepetido(id, canal)
{
	estaActivo[canal]=true;
	for(var i=0;i<ultimasDiez[canal].length;i++)
	{
		if(id==ultimasDiez[canal][i])
		{
			return false;
		}
	}
	if(ultimasDiez[canal].length==10)
	{
		var auxiliar=ultimasDiez[canal].slice(1);
		ultimasDiez[canal]=auxiliar;
	}
	ultimasDiez[canal].push(id);
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
function esASCII(cadena)
{
	return /^[\x00-\x7F]*$/.test(cadena);
}
function parseUsuarioOsu(canal)
{
	for(var i=0;i<usuarios.length;i++)
	{
		if(canal==usuarios[i].twitch)
		{
			return usuarios[i].osu;
		}
	}
}
function parseUsuarioTwitch(usuario)
{
	for(var i=0;i<usuarios.length;i++)
	{
		if(usuario==usuarios[i].osu)
		{
			return usuarios[i].twitch;
		}
	}
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
function inicializarRepetidos(canales, estaActivo)
{
	var i=0;
	var repetidos={};
	var intervalo;
	for(var i=0;i<canales.length;i++)
	{
		Object.defineProperty(repetidos, canales[i],
		{
			enumerable: true,
			configurable: true,
			writable: true,
			value: []
		});
		Object.defineProperty(estaActivo, canales[i],
		{
			enumerable: true,
			configurable: true,
			writable: true,
			value: false
		});
		intervalo=setInterval(function(repetidos, estaActivo)
		{
			if(estaActivo)
			{
				estaActivo=false;
			}
			else
			{
				repetidos.splice(0, repetidos.length);
			}
		}, 3600000, repetidos[canales[i]], estaActivo[canales[i]]);
		Object.defineProperty(intervalos, canales[i], {enumerable: true, configurable: true, writable: true, value: intervalo});
	}
	return repetidos;
}
function obtenerUsuarios()
{
	try
	{
		var data=fs.readFileSync(URL+'canales.json', "utf-8");
		return JSON.parse(data);
	}
	catch(error)
	{
		fs.writeFileSync(URL+'canales.json', JSON.stringify([{"twitch":"#"+DEFAULT_TWITCH,"osu":DEFAULT_OSU}]), "utf-8");
		return [{"twitch":"#"+DEFAULT_TWITCH,"osu":DEFAULT_OSU}];
	}
}
function obtenerCanales(usuarios)
{
	var canales=[];
	for(var i=0;i<usuarios.length;i++)
	{
		canales.push(usuarios[i].twitch);
	}
	return canales;
}
function agregarUsuario(twitch, osu)
{
	canales.push(twitch);
	usuarios.push({twitch:twitch, osu:osu});
	Object.defineProperty(ultimasDiez, twitch, {enumerable: true, configurable: true, writable: true, value: []});
	Object.defineProperty(estaActivo, twitch, {enumerable: true, configurable: true, writable: true, value: false});
	Object.defineProperty(isTimedOut, twitch, {enumerable: true, configurable: true, writable: true, value: false});
	Object.defineProperty(isSourPlsTimedOut, twitch, {enumerable: true, configurable: true, writable: true, value: false});
	var intervalo=setInterval(function(repetidos, estaActivo)
	{
		if(estaActivo)
		{
			estaActivo=false;
		}
		else
		{
			repetidos.splice(0, repetidos.length);
		}
	}, 3600000, ultimasDiez[twitch], estaActivo[twitch]);
	Object.defineProperty(intervalos, twitch, {enumerable: true, configurable: true, writable: true, value: intervalo});
	fs.writeFile(URL+'canales.json', JSON.stringify(usuarios), "utf-8", function(error)
	{
		if(error)
		{
			console.log(error);
		}
	});
	return client.join(twitch);
}
function eliminarUsuario(canal)
{
	var auxiliarCanales=[];
	for(var i=0;i<canales.length;i++)
	{
		if(canales[i]==canal)
		{
			continue;
		}
		auxiliarCanales.push(canales[i]);
	}
	canales=auxiliarCanales;
	auxiliarUsuarios=[];
	for(var i=0;i<usuarios.length;i++)
	{
		if(usuarios[i].twitch==canal)
		{
			continue;
		}
		auxiliarUsuarios.push(usuarios[i]);
	}
	usuarios=auxiliarUsuarios;
	delete ultimasDiez[canal];
	delete estaActivo[canal];
	delete isTimedOut[canal];
	delete isSourPlsTimedOut[canal];
	clearInterval(intervalos[canal]);
	delete intervalos[canal];
	fs.writeFile(URL+'canales.json', JSON.stringify(usuarios), "utf-8", function(error)
	{
		if(error)
		{
			console.log(error);
		}
	});
	return client.part(canal);
}
function obtenerBlacklisted()
{
	var blacklisted={};
	try
	{
		var data=fs.readFileSync(URL+'blacklisted.json', "utf-8");
		blacklisted=JSON.parse(data);
	}
	catch(error)
	{
	}
	return blacklisted;
}
function validarBlacklisted(id, canal)
{
	var lista=blacklisted[canal];
	if(lista==undefined)
	{
		return true;
	}
	for(var i=0;i<lista.length;i++)
	{
		if(id==lista[i])
		{
			return false;
		}
	}
	return true;
}
function agregarBlacklisted(usuario, mapId, esSet, comando)
{
	var canal=parseUsuarioTwitch(usuario);
	var url="https://osu.ppy.sh/api/get_beatmaps?k="+OSU_API_KEY+"&b="+mapId;
	var xhttp=new XMLHttpRequest();
	xhttp.open("GET", url, true);
	xhttp.send();
	xhttp.onreadystatechange=function()
	{
		if(xhttp.readyState==4 && xhttp.status==200)
		{
			var respuesta=JSON.parse(xhttp.responseText);
			if(respuesta.length==0)
			{
				ircBot.say(usuario, comando+" failed. The beatmap wasn't found.");
			}
			else
			{
				var mapa=respuesta[0];
				if(esSet)
				{
					var url2="https://osu.ppy.sh/api/get_beatmaps?k="+OSU_API_KEY+"&s="+mapa.beatmapset_id;
					var xhttp2=new XMLHttpRequest();
					xhttp2.open("GET", url2, true);
					xhttp2.send();
					xhttp2.onreadystatechange=function()
					{
						if(xhttp2.readyState==4 && xhttp2.status==200)
						{
							var respuesta2=JSON.parse(xhttp2.responseText);
							if(respuesta2.length==0)
							{
								ircBot.say(usuario, comando+" failed. The beatmap wasn't found.");
							}
							else
							{
								var idMapas=[];
								if(comando=="Blacklist")
								{
									for(var i=0;i<respuesta2.length;i++)
									{
										if(!validarBlacklisted(respuesta2[i].beatmap_id, canal))
										{
											continue;
										}
										idMapas.push(respuesta2[i].beatmap_id);
									}
									if(idMapas.length>0)
									{
										escribirBlacklisted(idMapas, mapa.artist+" - "+mapa.title, esSet, canal, usuario);
									}
									else
									{
										ircBot.say(usuario, "Blacklist failed. The beatmap set \""+mapa.artist+" - "+mapa.title+"\" is already blacklisted.");
									}
								}
								else if(comando=="Whitelist")
								{
									for(var i=0;i<respuesta2.length;i++)
									{
										if(validarBlacklisted(respuesta2[i].beatmap_id, canal))
										{
											continue;
										}
										idMapas.push(respuesta2[i].beatmap_id);
									}
									if(idMapas.length>0)
									{
										eliminarBlacklisted(idMapas, mapa.artist+" - "+mapa.title, esSet, canal, usuario);
									}
									else
									{
										ircBot.say(usuario, "Whitelist failed. The beatmap set \""+mapa.artist+" - "+mapa.title+"\" is not blacklisted.");
									}
								}
							}
						}
					}
				}
				else
				{
					if(comando=="Blacklist")
					{
						if(validarBlacklisted(mapa.beatmap_id, canal))
						{
							escribirBlacklisted(mapa.beatmap_id, mapa.artist+" - "+mapa.title+" ["+mapa.version+"]", esSet, canal, usuario);
						}
						else
						{
							ircBot.say(usuario, "Blacklist failed. The beatmap \""+mapa.artist+" - "+mapa.title+" ["+mapa.version+"]"+"\" is already blacklisted.");
						}
					}
					else if(comando=="Whitelist")
					{
						if(!validarBlacklisted(mapa.beatmap_id, canal))
						{
							eliminarBlacklisted(mapa.beatmap_id, mapa.artist+" - "+mapa.title+" ["+mapa.version+"]", esSet, canal, usuario);
						}
						else
						{
							ircBot.say(usuario, "Whitelist failed. The beatmap \""+mapa.artist+" - "+mapa.title+" ["+mapa.version+"]"+"\" is not blacklisted.");
						}
					}
				}
			}
		}
	}
}
function escribirBlacklisted(mapId, mapNombre, esSet, canal, usuario)
{
	if(blacklisted[canal]==undefined)
	{
		var valor;
		if(esSet)
		{
			valor=mapId;
		}
		else
		{
			valor=[mapId];
		}
		Object.defineProperty(blacklisted, canal,
		{
			enumerable: true,
			configurable: true,
			writable: true,
			value: valor
		});
	}
	else
	{
		if(esSet)
		{
			for(var i=0;i<mapId.length;i++)
			{
				blacklisted[canal].push(mapId[i]);
			}
		}
		else
		{
			blacklisted[canal].push(mapId);
		}
	}
	fs.writeFile(URL+'blacklisted.json', JSON.stringify(blacklisted), "utf-8", function(error)
	{
		if(error)
		{
			console.log(error);
		}
		else
		{
			if(esSet)
			{
				ircBot.say(usuario, "The beatmap set \""+mapNombre+"\" was blacklisted successfully.");
			}
			else
			{
				ircBot.say(usuario, "The beatmap \""+mapNombre+"\" was blacklisted successfully.");
			}
		}
	});
}
function eliminarBlacklisted(mapId, mapNombre, esSet, canal, usuario)
{
	if(esSet)
	{
		for(var i=0;i<mapId.length;i++)
		{
			for(var j=0;j<blacklisted[canal].length;j++)
			{
				if(mapId[i]==blacklisted[canal][j])
				{
					blacklisted[canal].splice(j, 1);
					break;
				}
			}
		}
	}
	else
	{
		for(var i=0;i<blacklisted[canal].length;i++)
		{
			if(mapId==blacklisted[canal][i])
			{
				blacklisted[canal].splice(i, 1);
				break;
			}
		}
	}
	fs.writeFile(URL+'blacklisted.json', JSON.stringify(blacklisted), "utf-8", function(error)
	{
		if(error)
		{
			console.log(error);
		}
		else
		{
			if(esSet)
			{
				ircBot.say(usuario, "The beatmap set \""+mapNombre+"\" was whitelisted successfully.");
			}
			else
			{
				ircBot.say(usuario, "The beatmap \""+mapNombre+"\" was whitelisted successfully.");
			}
		}
	});
}
function parseVerse(verse)
{
	var newVerse=verse
	.replace(/<span class="woc">/g, "")
	.replace(/<span class="small-caps">Lord<\/span>/g, "Lord")
	.replace(/<span.*?<\/span>/g, "")
	.replace(/<\/span>/g, "")
	.replace(/&#8220;/g, "\'")
	.replace(/&#8221;/g, "\'")
	.replace(/&#8222;/g, "—")
	.replace(/<br\/>/g, " ")
	.replace(/<p.*?>/g, "")
	.replace(/<\/p>/g, "")
	.replace(/<div.*?>/g, "")
	.replace(/<\/div>/g, "")
	.replace(/.&nbsp/g, "")
	.replace(/<h4.*?<\/h4>/g, "");
	return newVerse;
}
function mostrarEstado()
{
	fs.readFile(URL+'canales.json', "utf-8", function(error, datos)
	{
		if(error)
		{
			return;
		}
		console.log(datos);
	});
	fs.readFile(URL+'blacklisted.json', "utf-8", function(error, datos)
	{
		if(error)
		{
			return;
		}
		console.log(datos);
	});
}
function transferirBlacklisted(canalDesde, canalHasta, callback)
{
	var auxiliar=blacklisted[canalDesde].slice();
	Object.defineProperty(blacklisted, canalHasta, {enumerable: true, configurable: true, writable: true, value: auxiliar});
	actualizarBlacklisted(callback);
}
function eliminarUsuarioBlacklisted(canal, callback)
{
	delete blacklisted[canal];
	actualizarBlacklisted(callback);
}
function actualizarBlacklisted(callback)
{
	fs.writeFile(URL+'blacklisted.json', JSON.stringify(blacklisted), "utf-8", callback);
}
function obtenerContadorYowzar()
{
	try
	{
		var datos=fs.readFileSync(URL+'yowzar.json', "utf-8");
		return JSON.parse(datos).contador;
	}
	catch(error)
	{
		fs.writeFile(URL+'yowzar.json', JSON.stringify({contador:0}), "utf-8", function(error2)
		{
			if(error2)
			{
				console.log(error2);
			}
		});
		return 0;
	}
}
function sumarContadorYowzar()
{
	contadorYowzar++;
	fs.writeFile(URL+'yowzar.json', JSON.stringify({contador:contadorYowzar}), "utf-8", function(error){});
}
function obtenerTipoDisplay(canales)
{
	try
	{
		var datos=fs.readFileSync(URL+'displays.json', "utf-8");
		return JSON.parse(datos);
	}
	catch(error)
	{
		return {};
	}
}
function cambiarTipoDisplay(canal, text)
{
	if(tipoDisplay[canal]==undefined)
	{
		Object.defineProperty(tipoDisplay, canal, {enumerable: true, configurable: true, writable: true, value: "Requestor First"});
	}
	else if(tipoDisplay[canal]=="Requestor Last")
	{
		tipoDisplay[canal]="Requestor First";
	}
	else
	{
		tipoDisplay[canal]="Requestor Last";
	}
	fs.writeFile(URL+'displays.json', JSON.stringify(tipoDisplay), "utf-8", function(error)
	{
		if(error)
		{
			console.log(error);
			return;
		}
		ircBot.say(parseUsuarioOsu(canal), "Changed display type for requests to \""+tipoDisplay[canal]+"\".");
	});
}
function cargarBlacklistedDisplay(canal, user)
{
	if(blacklisted[canal]==undefined)
	{
		client.say(canal, "@"+user+" "+parseUsuarioOsu(canal)+" doesn't have any blacklisted beatmap at the moment.");
		return;
	}
	if(blacklistedDisplay[canal]==undefined)
	{
		Object.defineProperty(blacklistedDisplay, canal, {enumerable: true, configurable: true, writable: true, value: []});
		var listaBl=blacklisted[canal];
		var cantidadBl=listaBl.length;
		if(cantidadBl==0)
		{
			client.say(canal, "@"+user+" "+parseUsuarioOsu(canal)+" doesn't have any blacklisted beatmap at the moment.");
			return;
		}
		for(var i=0;i<cantidadBl;i++)
		{
			obtenerBlacklistedDisplay(listaBl[i], canal, function()
			{
				if(blacklistedDisplay[canal].length==cantidadBl)
				{
					client.say(canal, "@"+user+" "+WEB_URL+"/blacklisted/"+parseUsuarioOsu(canal));
				}
			});
		}
		return;
	}
	if(blacklistedDisplay[canal].length==0 && blacklisted[canal].length==0)
	{
		client.say(canal, "@"+user+" "+parseUsuarioOsu(canal)+" doesn't have any blacklisted beatmap at the moment.");
		return;
	}
	var idRepetidos=[];
	var blRepetidos=[];
	for(var i=0;i<blacklistedDisplay[canal].length;i++)
	{
		var estaIncluido=false;
		for(var j=0;j<blacklisted[canal].length;j++)
		{
			if(blacklistedDisplay[canal][i].id==blacklisted[canal][j])
			{
				estaIncluido=true;
				break;
			}
		}
		if(estaIncluido)
		{
			idRepetidos.push(blacklistedDisplay[canal][i].id);
			blRepetidos.push(blacklistedDisplay[canal][i]);
		}
	}
	blacklistedDisplay[canal]=blRepetidos;
	if(blacklistedDisplay[canal].length==blacklisted[canal].length)
	{
		client.say(canal, "@"+user+" "+WEB_URL+"/blacklisted/"+parseUsuarioOsu(canal));
		return;
	}
	var nuevosBl=blacklisted[canal].filter(function(id)
	{
		return !idRepetidos.includes(id);
	});
	for(var i=0;i<nuevosBl.length;i++)
	{
		obtenerBlacklistedDisplay(nuevosBl[i], canal, function()
		{
			if(blacklistedDisplay[canal].length==blacklisted[canal].length)
			{
				client.say(canal, "@"+user+" "+WEB_URL+"/blacklisted/"+parseUsuarioOsu(canal));
			}
		});
	}
}
function obtenerBlacklistedDisplay(id, canal, callback)
{
	var url="https://osu.ppy.sh/api/get_beatmaps?k="+OSU_API_KEY+"&b="+id;
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
				var map=respuesta[0];
				if(map!=undefined)
				{
					blacklistedDisplay[canal].push({id:id, nombre:map.artist+" - "+map.title, version:map.version, dificultad:map.difficultyrating, set:map.beatmapset_id});
				}
				else
				{
					blacklistedDisplay[canal].push({id:id});
				}
				callback();
			}
		}
	}
}
function obtenerModoComando(canales)
{
	try
	{
		var datos=fs.readFileSync(URL+'modoComando.json', "utf-8");
		return JSON.parse(datos);
	}
	catch(error)
	{
		return {};
	}
}
function cambiarModoComando(canal, modo)
{
	modoComando[canal]=modo;
	fs.writeFile(URL+'modoComando.json', JSON.stringify(modoComando), "utf-8", function(error)
	{
		if(error)
		{
			console.log(error);
			return;
		}
		client.say(canal, "Command mode is now set to \""+modoComando[canal]+"\".");
	});
}