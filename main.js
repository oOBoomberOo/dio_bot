const discord = require('discord.js');
const writeFile = require('write');
const getJSON = require('get-json');
const fetch = require('node-fetch');
const auth = require('./auth.json');
const response_list = 'https://raw.githubusercontent.com/oOBoomberOo/dio_bot/master/response_list.json';
let promise = getJSON(response_list);
let responseList = [];
let errorList = [];
let logs = [];
let max_logs = 5000;
let second = 1000;
let minute = 60 * second;
let hour = 60 * minute;
let schedule_backup_time = 12 * hour;
let bot = new discord.Client();

// * Start bot only when promise returned
promise.then(response => {
	responseList = response['values'];
	specialResponseList = response['special'];
	errorList = response['errors'];
	
	bot.login(auth.token)
	
	bot.on('ready', () => { 
		logging(`Bot logged in as ${bot.user.username}<${bot.user.id}>`);
		schedule_backup(logs);
	});
	
	bot.on('message', message => {
		let author = message.author;
		let channel = message.channel;
		let content = message.content;
		let dio_regex = /(?!`+.*)dio[!?](?!.*`+)/gi;
		let cmd_regex = /!dio/i;
		
		if (content.search(dio_regex) >= 0 && !author.bot) {
			callDio(message);
		}
		else if (content.search(cmd_regex) === 0 && !author.bot && content.split(' ').length > 1) {
			cmdDio(message);
		}

		if (logs.length > max_logs) {
			console.log('Log reach limit write current log to /logs/');
			backup(logs);
		}

	});

	bot.on('error', error => {
		logging(`${error.message}: ${error.error}`);
	})
})
.catch(error => {
	logging(`${error.message}: ${error.error}`);
});

process.on('cleanup', () => {
	exit_with_backup(logs);
});

process.on('SIGINT', () => {
	console.info('Ctrl-C...');
	process.emit('cleanup');
});

process.on('uncaughtException', event => {
	console.info('Uncaught Exception...');
	console.log(event.stack);
	process.emit('cleanup');
	process.exit(99);
});


// * schedule a backup
function schedule_backup() {
	console.info(`Begin schedule backup...`);
	backup(logs);
	console.info(`Will backup again in ${schedule_backup_time}ms or ${schedule_backup_time/(1000*60)} minutes`);
	setTimeout(() => {
		schedule_backup();
	}, schedule_backup_time);
}

// * perform backup and clear logs
async function backup(logs) {
	console.info('Backup in process...');
	let log_content;
	try {
		log_content = logs.join('\n');
	} catch (error) {
		log_content = '';
		logging(`${error.message}: ${error.error}`);
	}
	let {d, mn, h, m, s} = getCurrentTime();
	let {day, month, year} = getCurrentDate();
	await writeFile(`./logs/${year}_${month}_${day}-${h}_${m}.log`, log_content).catch(error => logging(`${error.message}: ${error.error}`));
	logs = [];
	console.log('Backup completed');
	return true;
}

async function exit_with_backup(logs) {
	await backup(logs);
	process.exit(0);
}

// * log message
function logging(message) {
	let {d, mn, h, m, s} = getCurrentTime();
	let log_message = `${d}/${mn} [${h}:${m}:${s}]: ${message}`;
	console.log(log_message);
	logs.push(log_message);
}


// * Handle dio! command
async function callDio(message) {
	let author = message.author;
	let channel = message.channel;
	let attachment = channel.type === 'dm' ? 'DM': `${message.guild.name}`;

	logging(`${author.tag}<${attachment}> execute dio! command`);
	let index = Math.floor(Math.random() * responseList.length);
	sendMessage(channel, responseList[index]);
}


// * Handle !dio command
async function cmdDio(message) {
	let author = message.author;
	let channel = message.channel;
	let content = message.content;

	let attachment = channel.type === 'dm' ? 'DM': `${message.guild.name}`;
	let cmd = content.substring(content.search(/ /) + 1);
	let mResponse = {message: '', file: ''};
	logging(`${author.tag}<${attachment}> execute !dio ${cmd} command`);
	
	// Regex testing
	switch(true) {
		case /\d/g.test(cmd):
			if (parseInt(cmd) < responseList.length) {
				mResponse = responseList[parseInt(cmd)];
			}
			else {
				mResponse = {message: errorList['invalid-command'].message.replace('%s', cmd)};
				logging(`${author.tag}<${attachment}> execute invalid command -> !dio ${cmd}`);
			}
			break;
		case /restart/.test(cmd):
			mResponse.message = 'Restarting...';
			getJSON(response_list)
			.then(response => {
				responseList = response['values'];
				errorList = response['errors'];
				backup(logs);
				return response;
			})
			.catch(error => {
				console.log(error);
			});
			break;
		case cmd in specialResponseList:
			mResponse = specialResponseList[cmd];
			break;
		case /weeb/.test(cmd):
			mResponse = {message: await getRandomReddit('Animemes', 'hot', 25)};
			break;
		default:
			mResponse = {message: errorList['invalid-command'].message.replace('%s', cmd)};
			logging(`${author.tag}<${attachment}> execute invalid command -> !dio ${cmd}`);
	}
	sendMessage(channel, mResponse);
}


// * Handle object {message: "foo", file: "bar"} and send them
function sendMessage(channel, message) {
	if (message.file !== '' && message.file !== undefined && message.file !== null) {
		bot.channels.get(channel.id).send(message.message, {file: message.file});
	}
	else if (message.message) {
		bot.channels.get(channel.id).send(message.message);
	}
}

async function getRandomReddit(sub, type, limit) {
	let url = `https://reddit.com`;
	let result = await fetch(`${url}/r/${sub}/${type}.json?limit=${limit}&rawjson=true`).then(response => response.json()).catch(error => {throw error;});
	let posts = result.data.children;
	let post = posts[Math.floor(Math.random() * posts.length)].data.permalink;
	return `${url}${post}`;
}

// * Return current time in format {DD, M, hh, mm, ss}
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


// * Return current date in format {YYYY, MM, DD}
function getCurrentDate() {
	let date = new Date();
	let day = date.getDate();
	let month = date.getMonth();
	let year = date.getFullYear();

	day = (day < 10 ? '0': '') + day;
	month = (month < 10 ? '0': '') + month;
	
	return {day: day, month: month, year: year};
}
