var tmi = require("tmi.js");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var fs = require('fs');
const TWITCH_ID=process.env.twitchid;
const TWITCH_OAUTH=process.env.twitchoauth;
const OSU_API_KEY=process.env.osuapikey;
const IRC_PASS=process.env.ircpass;
const URL=process.env.rutabase;
var usuarios=obtenerUsuarios();
var canales=obtenerCanales(usuarios);
var blacklisted=obtenerBlacklisted();
var contador=0;
var isTimedOut=inicializarTimeouts(canales);
var cooldown=0;
var isSourPlsTimedOut=inicializarTimeouts(canales);
var usuarioRequestId=-1;
var estaActivo={};
var intervalos={};
var ultimasDiez=inicializarRepetidos(canales, estaActivo);
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
			cooldown=10000;
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
					client.say(canal, "Unfortunately, "+canal.substring(1)+" has already played the Mayday map and won't play it right now. Thanks for requesting though! azerHappy");
				}
				else if(message.startsWith("!maydont"))
				{
					client.say(canal, "https://clips.twitch.tv/BreakableSecretiveJalapenoRitzMitz?tt_content=chat_card&tt_medium=twitch_chat");
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
			isTimedOut[canal]=true;
			setTimeout(function()
			{
				isTimedOut[canal]=false;
			}, cooldown);
			if(message.startsWith("!adduser") && userName=="gaby12521")
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
			else if(message.startsWith("!removeuser") && userName=="gaby12521")
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
			else if((message.startsWith("!blacklist ") || message.startsWith("!bl ")) && "#"+userName==canal)
			{
				escucharPM(parseUsuarioOsu(canal), message, null);
			}
			else if((message.startsWith("!whitelist ") || message.startsWith("!wl ")) && "#"+userName==canal)
			{
				escucharPM(parseUsuarioOsu(canal), message, null);
			}
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
					client.say(canal, "@"+user+" Unfortunately, "+canal.substring(1)+" has blacklisted the beatmap you requested. Try requesting another beatmap azerHappy");
					return;
				}
				if(!validarRepetido(map.beatmap_id, canal))
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
	bot.addListener("pm", escucharPM);
	bot.addListener("error", function(message)
	{
		console.log(message);
	});
	return bot;
}
function escucharPM(nick, text, message)
{
	if(text.startsWith("!blacklist ") || text.startsWith("!bl "))
	{
		comenzarBlacklist(nick, text, "Blacklist");
	}
	else if(text.startsWith("!whitelist ") || text.startsWith("!wl "))
	{
		var canal;
		for(var i=0;i<usuarios.length;i++)
		{
			if(usuarios[i].osu==nick)
			{
				canal=usuarios[i].twitch;
				break;
			}
		}
		if(blacklisted[canal]==undefined || blacklisted[canal].length==0)
		{
			ircBot.say(nick, "Whitelist failed. You don't have any blacklisted beatmap currently.");
			return;
		}
		comenzarBlacklist(nick, text, "Whitelist");
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
	var data=fs.readFileSync(URL+'canales.json', "utf-8");
	return JSON.parse(data);
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
	}, 3600000, repetidos[canales[i]], estaActivo[canales[i]]);
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
		var data=fs.readFileSync('blacklisted.json', "utf-8");
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
	var canal="";
	for(var i=0;i<usuarios.length;i++)
	{
		if(usuarios[i].osu==usuario)
		{
			canal=usuarios[i].twitch;
			break;
		}
	}
	if(canal=="")
	{
		return;
	}
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