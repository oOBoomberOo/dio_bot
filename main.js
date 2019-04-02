const discord = require('discord.js');
const auth = require('./auth.json');
const jsonfile = require('jsonfile');
const writeFile = require('write');
const getJSON = require('get-json');
const response_list = './response_list.json';
let promise = getJSON('https://raw.githubusercontent.com/oOBoomberOo/dio_bot/master/response_list.json');
let responseList = [];
let errorList = [];
let logs = [];
let max_logs = 5000;
let bot = new discord.Client();

promise.then(response => {
	responseList = response['values'];
	errorList = response['errors'];
	
	bot.login(auth.token)
	
	bot.on('ready', () => { 
		console.log('Bot logged in as: ' + bot.user.username + '<' + bot.user.id + '>');
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
		else if (content.search(cmd_regex) === 0 && !author.bot) {
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
				console.log(error);
			});
		}

	});
});

function callDio(message) {
	let author = message.author;
	let channel = message.channel;
	let content = message.content;

	logs.push(`${getCurrentTime()}: ${author.username} execute dio! command.`);
	let index = Math.floor(Math.random() * responseList.length);
	sendMessage(channel, responseList[index]);
}

function cmdDio(message) {
	let author = message.author;
	let channel = message.channel;
	let content = message.content;

	let cmd = content.substring(content.search(/ /) + 1);
	let mResponse = {message: '', file: ''};
	logs.push(`${getCurrentTime()}: ${author.username} execute !dio ${cmd} command.`);
	
	// Regex testing
	switch(true) {
		case /\d/g.test(cmd):
			if (parseInt(cmd) < responseList.length) {
				mResponse = responseList[parseInt(cmd)];
			}
			else {
				mResponse = {message: errorList['invalid-command'].replace('%s', cmd)};
				logs.push(`${getCurrentTime()}: ${author.username} execute invalid command: !dio ${cmd}`);
			}
			break;
		case /restart/.test(cmd):
			mResponse.message = 'Restarting...';
			jsonResponse = getJSON('https://raw.githubusercontent.com/oOBoomberOo/dio_bot/master/response_list.json').then(response => {
				responseList = response['values'];
				errorList = response['errors'];
				return response;
			})
			.catch(error => {
				console.log(error);
			});
			break;
		default:
			mResponse = {message: errorList['invalid-command'].replace('%s', cmd)};
			logs.push(`${getCurrentTime()}: ${author.username} execute invalid command: !dio ${cmd}`);
	}
	sendMessage(channel, mResponse);
}

function sendMessage(channel, message) {
	if (message.file !== '' || message.file != undefined || message.file != null) {
		bot.channels.get(channel.id).send(message.message, {file: message.file});
	}
	else {
		bot.channels.get(channel.id).send(message.message);
	}
}

function getCurrentTime() {
	let date = new Date();
	let hour = date.getHours();
	hour = (hour < 10 ? '0': '') + hour;
	let minute = date.getMinutes();
	minute = (minute < 10 ? '0': '') + minute;
	let second = date.getSeconds();
	second = (second < 10 ? '0': '') + second;
	let day = date.getDate();
	day = (day < 10 ? '0': '') + day;
	let month = date.getMonth();
	
	return `${day}/${month} [${hour}:${minute}:${second}]`;
}

function getCurrentDate() {
	let date = new Date();
	let day = date.getDate();
	day = (day < 10 ? '0': '') + day;
	let month = date.getMonth();
	let year = date.getFullYear();
	
	return `${year}_${month}_${day}`;
}