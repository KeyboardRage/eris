"use strict";

const Base = require("../structures/Base");

/**
* Represents a command entity
* @prop {Object} subcommands Object mapping subcommand labels to Command objects
* @prop {Command?} parentCommand If this command is also a subcommand, this will refer to its parent Command
*/
class Command {
	/**
	 * Create a command
	 * @arg {String} name The name of the command
	 * @arg {Function} exec The command to execute
	 * @arg {Object} meta Command meta
	 * @arg {Array<String>} [meta.aliases] An array of command aliases
	 * @arg {Number} [meta.permission=ACCESS.user] The permission required for execution. Defaults to User.
	 * @arg {String} [meta.permissionMsg] An error message to send to user if no permission
	 * @arg {Number} [meta.cooldown=3] A cooldown for the command
	 * @arg {Boolean} [meta.dm=true] If command can be used in DM
	 * @arg {String} [meta.desc] A >65 char desc of command
	 * @arg {String} [meta.fullDesc] A >300 char full description of the command
	 * @arg {Array<String>} [meta.examples=[name]] An array of example use strings
	 * @arg {Array<Object>} [meta.flags] An array of flags associated with the command
	 * @arg {Number} [meta.group=1] The numeric representation of the category/group command belongs to
	 * @arg {Array<Object>} [meta.meta] An array of additional meta/information about the command
	 * @arg {String} [meta.syntax=name] A string showing the syntax for the command
	 * @arg {Function} meta.help A function giving help documentation
	 * @arg {Function} [meta.requirement] A function returning true/false to proceed execution, for requirement checks
	 * @arg {Array<String>} [meta.associatedFiles] Files associated with the command that are not in default structure, for reloading.
	 */
	constructor({name, meta, exec, parentCommand, fileLoc, fileName}) {
		// Other validation
		this._validateInput({name, meta, exec, parentCommand, fileLoc, fileName});

		// Assign values
		this.name = name;
		this.aliases = meta.aliases || [`${this.name}`];
		this.desc = meta.desc;
		this.fullDesc = meta.fullDesc;
		this.syntax = meta.syntax||this.name;
		this.dm = !!meta.dm||true;
		this.flags = meta.flags = [];
		this.cooldown = meta.cooldown||3;
		this.permission = meta.permission||ACCESS.user;
		this.permissionMsg = meta.permissionMsg || false;
		this.errorMsg = meta.errorMsg || "<:Stop:588844523832999936> **Oops!** An error occurred! Incident has been logged.";
		this.group = meta.group || 1;
		this.meta = meta.meta || [];
		this.examples = meta.examples || [`${this.name}`];
		this.parentCommand = parentCommand;
		this.requirement = meta.requirement || {};
		this.exec = exec;
		this.help = meta.help;
		this.associatedFiles = meta.associatedFiles || [];
		this.task = Object();

		// Todo:
		meta.defaultSubcommandOptions = {};

		this.fileLoc = fileLoc;
		this.fileName = fileName;
		/**
		 * Enabling or disabling of the command.
		 * @property {Boolean} enabled Command is enabled
		 */
		this.enabled = meta.enabled?!!meta.enabled:true;
		/**
		 * The message to print out if used, but disabled
		 * @property {String} disabledMsg Disabled message
		 */
		this.disabledMsg = "<:Info:588844523052859392> **Maintenance:** Command has been disabled for maintenance."
	}

	_validateMeta({name, meta, exec, parentCommand, fileLoc, fileName, ignoreFileData}) {
		// Validation
		if (!name) throw new Error("Command name missing!");
		if (!meta) throw new Error("Command meta is missing!");
		if (!exec) throw new Error("Command execution is missing!");
		if(!ignoreFileData) {
			if (!fileLoc || typeof (fileLoc) !== "string") throw new Error("Missing fileLoc parameter!");
			if (!fileName || typeof (fileName) !== "string") throw new Error("Missing fileName parameter!");
		}
		if (task) throw new Error("This parameter is reserved for task binding! Use 'command.task = task' during runtime!");
		if (typeof (name) !== "string" || !name.length || !/^[a-z]+$/.test(name)) throw new Error("Invalid command name or not type string!");

		// Meta vlidation
		if(meta.aliases&&!Array.isArray(meta.aliases)) throw new Error("Aliases is not array!");
		if(!meta.aliases.every(e => typeof (e) === "string")) throw new Error("Aliases must be strings!");
		if(meta.permission&&isNaN(meta.permission)) throw new Error("Permission is not number!");
		if(!Number.isInteger(meta.permission)) throw new Error("Permission is not integer!");
		if(meta.cooldown && isNaN(meta.cooldown)) throw new Error("Cooldown is not number!");
		if(parseInt(meta.cooldown>200)||parseInt(meta.cooldown<0)) throw new Error("Cooldown is invalid range: min 0, max 200!");
		if(!meta.desc||!meta.desc.length) throw new Error("Description is missing!");
		if(meta.desc.length>65) throw new Error("Description cannot be more than 65 characters!");
		if(!meta.fullDesc||!meta.fullDesc.length) throw new Error("Full description is missing!");
		if(meta.fullDesc.length>300) throw new Error("Full description cannot be more than 300 characters!");
		if(meta.examples&&(!Array.isArray(meta.examples)||!meta.examples.length)) throw new Error("Examples empty or is not array!");
		if(meta.examples&&meta.examples.length&&!meta.examples.every(e=>typeof(e)==="string")) throw new Error("Examples must be strings!");
		if(meta.flags&&meta.flags.length) {
			if(!meta.flags.every(f=>f.constructor.name==="Object")) throw new Error("Flags must be a list of objects!");
			if(!meta.flags.every(f=>f.hasOwnProperty("text")&&typeof(f.text)==="string")) throw new Error("One or more flags are missing or use invalid property! text:string, default:boolean, value:string");
			if(!meta.flags.every(f=>f.hasOwnProperty("value")&&typeof(f.value)==="string")) throw new Error("One or more flags are missing or use invalid property! text:string, default:boolean, value:string");
			if(!meta.flags.every(f=>f.hasOwnProperty("default")&&typeof(f.default)==="boolean")) throw new Error("One or more flags are missing or use invalid property! text:string, default:boolean, value:string");
		}
		if(meta.group&&isNaN(meta.group)) throw new Error("Group is not number!");
		if(meta.group&&!Number.isInteger(meta.group)) throw new Error("Group is not integer!");
		if(meta.meta&&meta.meta.length) {
			if(!meta.meta.every(f=>f.constructor.name==="Object")) throw new Error("Meta must be a list of objects!");
			if(!meta.meta.every(f=>f.hasOwnProperty("text")&&typeof(f.text)==="string")) throw new Error("One or more meta properties are missing or use invalid property! text:string, value:string");
			if(!meta.meta.every(f=>f.hasOwnProperty("value")&&typeof(f.text)==="string")) throw new Error("One or more meta properties are missing or use invalid property! text:string, value:string");
		}
		if(meta.syntax&&typeof(meta.syntax)!=="string"||!meta.syntax.length) throw new Error("Syntax is missing or not of type string!");
		if(typeof(exec)!=="function") throw new Error("The 'exec' is not of type function! Tip: should be async");
		if(!meta.help||typeof(meta.help)!=="function") throw new Error("The 'help' is missing or not of type function! Tip: should be async");
		if(meta.requirement && typeof(meta.requirement)!=="function") throw new Error("If you use requirement, it needs to be a function returning true/false!");
		if(meta.associatedFiles && (!Array.isArray(meta.associatedFiles)||!meta.associatedFiles.length)) throw new Error("Associated files list empty or does not contain strings!");
	}

	get fullName(){
		return this.fullLabel();
	} get fullLabel() {
		return `${this.parentCommand ? this.parentCommand.fullLabel+" ":""}${this.name}`;
	}

	/**
	 * Get enabled status of command
	 */
	get enabled() {
		return !!this.enabled;
	}
	/**
	 * Enable or disable the command on the fly
	 * @param {String} toggle false/disable to turn off. True/enable to enable.
	 * @abstract
	 */
	set enabled(toggle) {
		if(toggle==="false"||toggle==="disable") this.enabled = false;
		else if(toggle==="true"||toggle==="enable") this.enabled = true;
	}

	/**
	 * Get and set the task session in execution
	 * @arg {Object} task The RabbitMQ task
	 * @abstract
	 */
	set task(task) {
		//TODO: Check if task is instance of RabbitMQ
		this.task = task;
	}
	/**
	 * Get the task associated with current execution of the command.
	 * @returns {Object} Associated RabbitMQ task
	 */
	get task() {
		return this.task;
	}

    /**
     * Register an alias for a subcommand
     * @arg {String} alias The alias
     * @arg {String} name The original subcommand name
     */
	registerSubcommandAlias(alias, name) {
		if(!alias) throw new Error("Missing the new alias!");
		if(!name) throw new Error("Missing the main name of the command!");
		alias=alias.toLowerCase();
		name=name.toLowerCase();
		if(!this.subcommands[name]) throw new Error(`Could not find subcommand by name ${name} when trying to add ${alias}!`);
		if(this.subcommandAliases[alias]) throw new Error(`The alias ${name} is already in use!`);
		this.subcommandAliases[alias] = name;
		this.subcommands[name].aliases.push(alias);
	}

	/**
	 * Unregister a subcommand
	 * @arg {String} name The subcommand name
	 */
	unregisterSubcommand(name) {
		if(!name) throw new Error("Missing the main name of the command!");
		name=name.toLowerCase();
        const original = this.subcommandAliases[name];
        if(original) {
            this.subcommands[original].aliases.splice(this.subcommands[original].aliases.indexOf(name), 1);
            delete this.subcommandAliases[name];
        } else {
            delete this.subcommands[name];
        }
	}

	/**
	 * Same as making a new command, except it gets added as a sub-command.
	 * @param {String} name The name of the sub-command
	 * @param {Object} [meta] Metadata for the sub-command. Can be same as command.
	 * @param {Function} exec The function to execute when invoked
	 * @returns {String} The new sub-commands name.
	 */
	registerSubcommand({name, meta={}, exec}) {
		if(!name) throw new Error("Missing sub-command name!");
		if(!exec) throw new Error("Missing sub-command execution!");
		name=name.toLowerCase();
		if(typeof(name)!=="string"||name.includes(" ")||!name.length||!/^[a-z]+$/.test(name)) throw new Error("Invalid sub-command name or not type string!");
		if(this.subcommands[name]) throw new Error(`This command already has a sub-command named ${name}!`);
		
		// Loop over meta fields and apply, or use default
		//TODO: This need to be defined in constructor. Find a good solution for defaults and new fields.
		meta.defaultSubcommandOptions = meta.defaultSubcommandOptions || {};
		for(const key in this.defaultSubcommandOptions) {
			if(this.defaultSubcommandOptions.hasOwnProperty(key)&&meta[key] === undefined) {
				meta[key] = this.defaultSubcommandOptions[key];
				meta.defaultSubcommandOptions[key] = this.defaultSubcommandOptions[key];
			}
		}

		this.subcommands[name] = new Command({name, exec, meta, parentCommand:this});
		if(meta.aliases) {
			meta.aliases.forEach(alias => {
				this.subcommandAliases[alias] = name;
			});
		}
		return this.subcommands[name];
	}
	
	toString() {
		// Overrides .toString()
		return `${this.name} — ${this.desc}`;
	}

	toJSON(props = []) {
		// Overrides .toJSON() and JSON.parse()
		return Base.prototype.toJSON.call(this, [
			"parentCommand",
			"name",
			"desc",
			"fullDesc",
			"syntax",
			"aliases",
			"requirement",
			"dm",
			"cooldown",
			"cooldownMsg",
			"permission",
			"permissionMsg",
			"errorMsg",
			"flags",
			"group",
			"meta",
			"examples",
			"subcommands",
			"subcommandAliases",
			"help",
			"exec",
			...props
		]);
	}

	/**
	 * Main execution command. Does all necessary pre-checks etc.
	 * @param {Object} msg The message object
	 * @param {Array<String>} [args] Arguments passed in to the command
	 * @param {Object} [doc] The guild settings/document
	 * @returns {Object} Execution result when completed.
	 */
	async run({msg, args, doc}) {
		if(!msg) throw new Error("Message missing!");
		if(this.hooks.postCheck) {
			const response = await Promise.resolve(this.hooks.postCheck(msg, args, true));
			if(response) {
				msg = response.msg || msg;
				args = response.args || args;
			}
		}

		const ret = this.execute(msg, args);
		if(this.hooks.postExecution) this.hooks.postExecution(msg, args, true);

		return ret;
	}

	/**
	 * Performs full module reload. Reloads associated files and structured files.
	 * @abstract
	 */
	async reload() {
		try {
			console.debug(`Reloading module: ${this.name}`);
			delete require.cache[require.resolve(this.fileLoc)];
	
			let {name, meta, exec, parentCommand} = require(this.fileLoc);
			this._validateMeta({name, meta, exec, parentCommand, ignoreFileData:true});
	
			// Re-assign values
			this.name = name;
			this.aliases = meta.aliases || [`${this.name}`];
			this.desc = meta.desc;
			this.fullDesc = meta.fullDesc;
			this.syntax = meta.syntax||this.name;
			this.dm = !!meta.dm||true;
			this.flags = meta.flags = [];
			this.cooldown = meta.cooldown||3;
			this.permission = meta.permission||ACCESS.user;
			this.permissionMsg = meta.permissionMsg || false;
			this.errorMsg = meta.errorMsg || "<:Stop:588844523832999936> **Oops!** An error occurred! Incident has been logged.";
			this.group = meta.group || 1;
			this.meta = meta.meta || [];
			this.examples = meta.examples || [`${this.name}`];
			this.parentCommand = parentCommand;
			this.requirement = meta.requirement || {};
			this.exec = exec;
			this.help = meta.help;
			this.associatedFiles = meta.associatedFiles || [];
			this.task = Object();
	
			// Todo:
			meta.defaultSubcommandOptions = {};
		} catch(err) {
			throw err;
		}
		console.debug("Main reload complete.");
		// Iterate over associated files
		if(this.associatedFiles&&this.associatedFiles.length) {
			try {
				this.associatedFiles.forEach((f,i) => {
					// For each associated, check if it exist.
					if(fs.existsSync(f)) {
						// Then reload it.
						console.debug(`Reloading: associated => ${this.name}[${i}]`);
						delete require.cache[require.resolve(f)];
						let _f = require(f);
						// Remove from cache if it is marked for deletion: module.exports = {DELETE:true};
						if(_f.DELETE===true) delete require.cache[require.resolve(f)];
					}
				});
			} catch(err) {
				throw err;
			}
		}
		try {
			// Try to reload structured associated files
			const path = require("path");
			const fs = require("fs");
			// Define root folder for file module folders
			let root = path.join(__dirname, `/src/${this.name}`);
			// If such an folder exist
			if(fs.existsSync(root)) {
				// Check its content
				fs.readdir(root, (err,files) => {
					if(err) throw err;
					files=files.filter(f=>f.endsWith(".js"));
					// For each .js file in it
					files.forEach((f,i) => {
						// Try to re-load that file
						console.debug(`Reloading: structured => ${this.name}[${i}]`);
						delete require.cache[require.resolve(path.join(root, `/${f}`))];
						let _f = require(path.join(root, `/${f}`));
						// Remove from cache if it is marked for deletion: module.exports = {DELETE:true};
						if (_f.DELETE === true) delete require.cache[require.resolve(path.join(root, `/${f}`))];
					});
				});
			}
		} catch(err) {
			throw err;
		}
		console.debug(`Full module reload completed.`);
		return true;
	}
};

module.exports = Command;