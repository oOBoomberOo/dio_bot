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
let schedule_backup_time = 12*60*60*1000;
let bot = new discord.Client();

let schedule_backup = function() {
	console.log(`Begin schedule backup...`);
	let log_content = logs.join('\n');
	let {d, mn, h, m, s} = getCurrentTime();
	let {day, month, year} = getCurrentDate();
	writeFile(`./logs/${year}_${month}_${day}-${h}_${m}.log`, log_content)
	.then(() => {
		logs = [];
	})
	.catch(error => {
		console.log(`${d}/${mn} [${h}:${m}:${s}]: ${error.message} / ${error.error}`);
	});
	console.log(`Will backup again in ${schedule_backup_time}ms or ${schedule_backup_time/(1000*60)} minutes`);
	setTimeout(schedule_backup, schedule_backup_time);
}

schedule_backup();

// Start bot only when promise returned
promise.then(response => {
	responseList = response['values'];
	errorList = response['errors'];
	
	bot.login(auth.token)
	
	bot.on('ready', () => { 
		let {d, mn, h, m, s} = getCurrentTime();
		console.log('Bot logged in as: ' + bot.user.username + '<' + bot.user.id + '>');
		logs.push(`${d}/${mn} [${h}:${m}:${s}]: Bot logged in as: ${bot.user.username}<${bot.user.id}>`);
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
			let {d, mn, h, m, s} = getCurrentTime();
			let {day, month, year} = getCurrentDate();
			writeFile(`./logs/${year}_${month}_${day}-${h}_${m}.log`, log_content)
			.then(() => {
				logs = [];
			})
			.catch(error => {
				console.log(`${d}/${mn} [${h}:${m}:${s}]: ${error.message} / ${error.error}`);
			});
		}

	});

	bot.on('error', error => {
		let {d, mn, h, m, s} = getCurrentTime();
		let error_message = `${d}/${mn} [${h}:${m}:${s}]: ${error.message} / ${error.error}`;
		console.log(error_message);
		logs.push(error_message);
	})
})
.catch(error => {
	let {d, mn, h, m, s} = getCurrentTime();
	let error_message = `${d}/${mn} [${h}:${m}:${s}]: ${error.message} / ${error.error}`;
	console.log(error_message);
	logs.push(error_message);
});

// Handle dio! command
function callDio(message) {
	let author = message.author;
	let channel = message.channel;

	let {d, mn, h, m, s} = getCurrentTime();
	let log_message = `${d}/${mn} [${h}:${m}:${s}]: ${author.username} execute dio! command.`;
	console.log(log_message);
	logs.push(log_message);
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
	let {d, mn, h, m, s} = getCurrentTime();
	let log_message = `${d}/${mn} [${h}:${m}:${s}]: ${author.username} execute !dio ${cmd} command.`;
	console.log(log_message);
	logs.push(log_message);
	
	// Regex testing
	switch(true) {
		case /\d/g.test(cmd):
			if (parseInt(cmd) < responseList.length) {
				mResponse = responseList[parseInt(cmd)];
			}
			else {
				let {d, mmnonth, h, m, s} = getCurrentTime();
				let log_message = `${d}/${mn} [${h}:${m}:${s}]: ${author.username} execute invalid command: !dio ${cmd}`;
				mResponse = {message: errorList['invalid-command'].message.replace('%s', cmd)};
				console.log(log_message);
				logs.push(log_message);
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
			let {d, mn, h, m, s} = getCurrentTime();
			let log_message = `${d}/${mn} [${h}:${m}:${s}]: ${author.username} execute invalid command: !dio ${cmd}`;
			logs.push(log_message);
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

// Return current time in format {DD, M, hh, mm, ss}
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
	
	return {d: day, mn: month, h: hour, m: minute, s: second};
}

// Return current date in format {YYYY, MM, DD}
function getCurrentDate() {
	let date = new Date();
	let day = date.getDate();
	let month = date.getMonth();
	let year = date.getFullYear();

	day = (day < 10 ? '0': '') + day;
	month = (month < 10 ? '0': '') + month;
	
	return {day: day, month: month, year: year};
}