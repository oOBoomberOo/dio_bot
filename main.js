const discord = require('discord.js');
const auth = require('./auth.json');
const writeFile = require('write');
const getJSON = require('get-json');
const response_list = 'https://raw.githubusercontent.com/oOBoomberOo/dio_bot/master/response_list.json';
let promise = getJSON(response_list);
let responseList = [];
let errorList = [];
let logs = [];
let max_logs = 5000;
let bot = new discord.Client();

// Start bot only when promise returned
promise.then(response => {
	responseList = response['values'];
	errorList = response['errors'];
	
	bot.login(auth.token)
	
	bot.on('ready', () => { 
		console.log('Bot logged in as: ' + bot.user.username + '<' + bot.user.id + '>');
		logs.push(`${getCurrentTime()}: Bot logged in as: ${bot.user.username}<${bot.user.id}>`);
	});
	
	bot.on('message', message => {
		let author = message.author;
		let channel = message.channel;
		let content = message.content;
		let dio_regex = /(?!.*`)\bdio[!?](?!.*`)/gi;
		let cmd_regex = /!dio/i;
		
		if (content.search(dio_regex) >= 0 && !author.bot) {
			callDio(message);
		}
		else if (content.search(cmd_regex) === 0 && !author.bot && content.split(' ').length > 1) {
			cmdDio(message);
		}

		if (logs.length > max_logs) {
			console.log('Log reach limit write current log to /logs/');
			let log_content = logs.join('\n');
			writeFile(`./logs/${getCurrentDate()}.log`, log_content)
			.then(() => {
				logs = [];
			})
			.catch(error => {
				console.log(error.message);
			});
		}

	});

	bot.on('error', error => {
		console.log(`${getCurrentTime}: ${error.message}`);
		logs.push(`${getCurrentTime}: ${error.message}`);
	})
})
.catch(error => {
	console.log(`${getCurrentTime}: ${error.message}`);
	logs.push(`${getCurrentTime}: ${error.message}`);
});

// Handle dio! command
function callDio(message) {
	let author = message.author;
	let channel = message.channel;

	console.log(`${getCurrentTime()}: ${author.username} execute dio! command.`);
	logs.push(`${getCurrentTime()}: ${author.username} execute dio! command.`);
	let index = Math.floor(Math.random() * responseList.length);
	sendMessage(channel, responseList[index]);
}

// Handle !dio command
function cmdDio(message) {
	let author = message.author;
	let channel = message.channel;
	let content = message.content;

	let cmd = content.substring(content.search(/ /) + 1);
	let mResponse = {message: '', file: ''};
	console.log(`${getCurrentTime()}: ${author.username} execute !dio ${cmd} command.`);
	logs.push(`${getCurrentTime()}: ${author.username} execute !dio ${cmd} command.`);
	
	// Regex testing
	switch(true) {
		case /\d/g.test(cmd):
			if (parseInt(cmd) < responseList.length) {
				mResponse = responseList[parseInt(cmd)];
			}
			else {
				mResponse = {message: errorList['invalid-command'].message.replace('%s', cmd)};
				logs.push(`${getCurrentTime()}: ${author.username} execute invalid command: !dio ${cmd}`);
			}
			break;
		case /restart/.test(cmd):
			mResponse.message = 'Restarting...';
			getJSON(response_list)
			.then(response => {
				responseList = response['values'];
				errorList = response['errors'];
				return response;
			})
			.catch(error => {
				console.log(error);
			});
			break;
		default:
			mResponse = {message: errorList['invalid-command'].message.replace('%s', cmd)};
			logs.push(`${getCurrentTime()}: ${author.username} execute invalid command: !dio ${cmd}`);
	}
	sendMessage(channel, mResponse);
}

// Handle object {message: "foo", file: "bar"} and send them
function sendMessage(channel, message) {
	if (message.file !== '' || message.file != undefined || message.file != null) {
		bot.channels.get(channel.id).send(message.message, {file: message.file});
	}
	else {
		bot.channels.get(channel.id).send(message.message);
	}
}

// Return current time in format DD/M [hh:mm:ss]
function getCurrentTime() {
	let date = new Date();
	let hour = date.getHours();
	let minute = date.getMinutes();
	let second = date.getSeconds();
	let day = date.getDate();
	let month = date.getMonth();

	hour = (hour < 10 ? '0': '') + hour;
	minute = (minute < 10 ? '0': '') + minute;
	second = (second < 10 ? '0': '') + second;
	day = (day < 10 ? '0': '') + day;
	
	return `${day}/${month} [${hour}:${minute}:${second}]`;
}

// Return current date in format YYYY_MM_DD
function getCurrentDate() {
	let date = new Date();
	let day = date.getDate();
	let month = date.getMonth();
	let year = date.getFullYear();

	day = (day < 10 ? '0': '') + day;
	month = (month < 10 ? '0': '') + day;
	
	return `${year}_${month}_${day}`;
}