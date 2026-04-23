// src/features/CombatManager.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { calculateEffectiveStats } = require('../systems/stats');
const { addExperience } = require('../systems/leveling');
const CLASSES = require('../data/classes');
const { MASTER_ITEM_MAP } = require('../data/shopItems');
const { rollRarity, rollStars, generateRandomStats, generateRandomAffixes } = require('../utils/rarityUtils');
const { updateQuestProgress } = require('../systems/questSystem');
const { getCurrentTimeAndWeather } = require('../systems/timeWeather');

// HSR Style Energy Values
const ENERGY_GAIN_BASIC = 20;
const ENERGY_GAIN_SKILL = 30;

class CombatManager {
    constructor(interaction, playerDoc, enemyOrWaves, tutorialEmbed = null) {
        this.interaction = interaction;
        this.playerDoc = playerDoc;
        this.tutorialEmbed = tutorialEmbed;
        
        const tw = getCurrentTimeAndWeather();
        this.weather = tw.weather;
        this.timeOfDay = tw.timeOfDay;
        this.weatherEffect = tw.effect;

        this.player = calculateEffectiveStats(playerDoc); 

        if (this.weatherEffect.type === 'combat') {
            const target = this.weatherEffect.target;
            const val = this.weatherEffect.value;
            if (target === 'spd') this.player.spd += val;
            else if (target === 'cr_rate') this.player.cr_rate += val;
            else if (this.player[target]) this.player[target] *= val;
        }

        const classData = CLASSES[this.playerDoc.class];
        this.ultimateData = classData ? classData.ultimate : null;
        this.maxEnergy = this.ultimateData ? this.ultimateData.energyCost : 100; 
        
        this.player.currentHp = Math.min(this.player.maxHp, this.playerDoc.stats.hp || this.player.maxHp); 
        this.player.currentStamina = Math.min(this.player.maxStamina, this.playerDoc.stats.stamina ?? this.player.maxStamina);
        this.player.currentMana = Math.min(this.player.maxMana, this.playerDoc.stats.mana ?? this.player.maxMana);
        this.player.statuses = [];
        this.player.currentEnergy = Math.min(this.maxEnergy, this.playerDoc.stats.energy || 0);

        if (Array.isArray(enemyOrWaves)) {
            this.waves = enemyOrWaves;
            this.currentWave = 0;
            this.isDungeon = true;
        } else {
            this.waves = [enemyOrWaves];
            this.currentWave = 0;
            this.isDungeon = false;
        }

        this.totalRewards = { xp: 0, classXp: 0, gold: 0, drops: [] };
        this.setupWave();
        
        // --- LOGGING SYSTEM ---
        this.worldHeader = `🕒 **Time:** ${this.timeOfDay} | 🌤️ **Weather:** ${this.weather}`;
        if (this.weatherEffect.type === 'combat') {
            this.worldHeader += `\n✨ **Weather Effect:** ${this.weatherEffect.desc}`;
        }
        
        this.logs = ["*The battle begins!*"];
        this.battleEnded = false;
        this.processing = false; 
        this.isUpdating = false;
        this.message = null;
        this.collectorCreated = false;

        if (this.player.spd >= 25) {
             this.logs.push("⚡ **Speed Bonus:** You move with blinding speed!");
        }
    }

    setupWave() {
        this.enemy = this.waves[this.currentWave];
        this.enemy.maxHp = this.enemy.hp; 
        this.enemy.statuses = [];
        this.isPlayerTurn = this.player.spd >= this.enemy.spd; 
    }

    gainEnergy(baseAmount) {
        if (!this.ultimateData) return 0;
        const egMult = (this.player.energy_regen || 100) / 100;
        const amount = Math.floor(baseAmount * egMult);
        const oldEn = this.player.currentEnergy;
        this.player.currentEnergy = Math.min(this.maxEnergy, this.player.currentEnergy + amount);
        return this.player.currentEnergy - oldEn;
    }

    async start() {
        await this.updateUI();
    }

    applyStatus(target, statusConfig) {
        const existing = target.statuses.find(s => s.id === statusConfig.id);
        if (existing) {
            existing.duration = Math.max(existing.duration, statusConfig.duration);
        } else {
            target.statuses.push({ ...statusConfig });
        }
    }

    async processStatuses(target, isPlayer) {
        const results = { skipTurn: false, logs: [] };
        const name = isPlayer ? 'You' : this.enemy.name;

        for (let i = target.statuses.length - 1; i >= 0; i--) {
            const s = target.statuses[i];
            
            if (s.id === 'poison') {
                const dmg = Math.max(1, Math.floor(target.maxHp * 0.05));
                if (isPlayer) this.player.currentHp -= dmg; else this.enemy.hp -= dmg;
                results.logs.push(`🤢 ${name} took **${dmg}** poison damage.`);
            } 
            else if (s.id === 'burn') {
                const dmg = Math.max(2, Math.floor(target.maxHp * 0.08));
                if (isPlayer) this.player.currentHp -= dmg; else this.enemy.hp -= dmg;
                results.logs.push(`🔥 ${name} took **${dmg}** burn damage.`);
            }
            else if (s.id === 'stun') {
                results.skipTurn = true;
                results.logs.push(`😵 ${name} is stunned and skips a turn!`);
            }
            else if (s.id === 'regen') {
                const heal = Math.floor(target.maxHp * 0.1);
                if (isPlayer) this.player.currentHp = Math.min(this.player.maxHp, this.player.currentHp + heal);
                else this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + heal);
                results.logs.push(`💖 ${name} healed for **${heal}** from regen.`);
            }

            s.duration--;
            if (s.duration <= 0) {
                target.statuses.splice(i, 1);
                results.logs.push(`✨ ${s.name} wore off for ${name}.`);
            }
        }
        return results;
    }

    async updateUI(ended = false, win = false) {
        if (this.isUpdating) return;
        this.isUpdating = true;

        try {
            const currentEnemyHp = Math.max(0, this.enemy.hp);
            const currentPlayerHp = Math.max(0, this.player.currentHp);
            
            const playerStatusStr = this.player.statuses.map(s => `${s.emoji}${s.duration}`).join(' ') || 'None';
            const enemyStatusStr = this.enemy.statuses.map(s => `${s.emoji}${s.duration}`).join(' ') || 'None';

            const waveStr = (this.isDungeon && this.waves.length > 1) ? `[Wave ${this.currentWave + 1}/${this.waves.length}] ` : '';

            const description = this.worldHeader + '\n\n' + this.logs.slice(-8).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`⚔️ ${waveStr}${this.playerDoc.username} vs ${this.enemy.name}`)
                .setDescription(description)
                .addFields(
                    { name: `🦸 You (Lvl ${this.playerDoc.level})`, value: `❤️ **HP:** ${Math.floor(currentPlayerHp)}/${this.player.maxHp}\n⚡ **Energy:** ${Math.floor(this.player.currentEnergy)}/${this.maxEnergy}\n✨ **Status:** ${playerStatusStr}`, inline: true },
                    { name: 'Resource', value: `💧 **Mana:** ${Math.floor(this.player.currentMana)}/${this.player.maxMana}\n💪 **Stamina:** ${Math.floor(this.player.currentStamina)}/${this.player.maxStamina}`, inline: true },
                    { name: `👹 ${this.enemy.name} (Lvl ${this.enemy.level || 1})`, value: `❤️ **HP:** ${Math.floor(currentEnemyHp)}/${this.enemy.maxHp}\n✨ **Status:** ${enemyStatusStr}`, inline: false }
                )
                .setColor(ended ? (win ? '#00FF00' : '#FF0000') : (this.enemy.type === 'boss' ? '#FF00FF' : '#FFFF00'))
                .setFooter({ text: ended ? "Battle Ended" : (this.isPlayerTurn ? "👉 Your Turn" : "⏳ Enemy Turn") });

            const row1 = new ActionRowBuilder();
            const row2 = new ActionRowBuilder();
            const isUltReady = this.player.currentEnergy >= this.maxEnergy;

            const classData = CLASSES[this.playerDoc.class];
            const skill1Name = classData?.skills?.[0]?.name || 'Skill 1';
            const skill2Name = classData?.skills?.[1]?.name || 'Skill 2';

            row1.addComponents(
                new ButtonBuilder().setCustomId('attack').setLabel('⚔️ Attack').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('skill1').setLabel(`1️⃣ ${skill1Name}`).setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('skill2').setLabel(`2️⃣ ${skill2Name}`).setStyle(ButtonStyle.Primary).setDisabled(this.playerDoc.classLevel < 5)
            );

            row2.addComponents(
                new ButtonBuilder()
                    .setCustomId('ultimate')
                    .setLabel('🌟 Ultimate')
                    .setStyle(isUltReady ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(!isUltReady),
                new ButtonBuilder().setCustomId('defend').setLabel('🛡️ Defend').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('flee').setLabel('🏃 Flee').setStyle(ButtonStyle.Secondary)
            );

            if (ended || !this.isPlayerTurn) {
                row1.components.forEach(btn => btn.setDisabled(true));
                row2.components.forEach(btn => btn.setDisabled(true));
            }

            const embeds = [embed];
            if (this.tutorialEmbed) {
                embeds.push(...this.tutorialEmbed);
            }

            this.message = await this.interaction.editReply({ embeds, components: [row1, row2] }).catch(() => null);
            this.hasFirstUpdated = true;

            if (this.message && !this.collectorCreated && !ended) {
                this.createCollector();
            }

            if (!ended && !this.isPlayerTurn) {
                setTimeout(() => this.enemyTurn(), 1200);
            }
        } catch (error) {
            console.error('UpdateUI Error:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    createCollector() {
        if (!this.message) return;
        this.collectorCreated = true;

        const collector = this.message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i => i.user.id === this.interaction.user.id,
            time: 300000 
        });

        this.collector = collector;

        collector.on('collect', async i => {
            try {
                await i.deferUpdate().catch(() => {}); 
                
                if (this.battleEnded || !this.isPlayerTurn || this.processing) return; 
                this.processing = true;

                const statusResults = await this.processStatuses(this.player, true);
                this.logs.push(...statusResults.logs);

                if (this.player.currentHp <= 0) {
                    this.logs.push(`💀 **You succumbed to your injuries!**`);
                    this.battleEnded = true;
                    collector.stop();
                    await this.endBattle(false);
                    this.processing = false;
                    return; 
                }

                if (statusResults.skipTurn) {
                    this.isPlayerTurn = false;
                    await this.updateUI();
                    this.processing = false;
                    return;
                }

                const action = i.customId;
                let turnAdvanced = false;

                if (action === 'attack') {
                    if (this.handleAttack()) turnAdvanced = true;
                }
                else if (action === 'skill1') {
                    if (this.handleSkill(0)) turnAdvanced = true;
                }
                else if (action === 'skill2') {
                    if (this.handleSkill(1)) turnAdvanced = true;
                }
                else if (action === 'ultimate') {
                    if (this.handleUltimate()) turnAdvanced = true;
                }
                else if (action === 'defend') {
                    if (this.handleDefend()) turnAdvanced = true;
                }
                else if (action === 'flee') {
                    this.logs.push(`🏃 **You fled the battle!**`);
                    this.battleEnded = true;
                    collector.stop();
                    await this.endBattle(false);
                    this.processing = false;
                    return;
                }

                if (turnAdvanced) {
                    if (this.enemy.hp <= 0) {
                        await this.checkNextWave();
                        this.processing = false;
                        return;
                    }
                    this.isPlayerTurn = false;
                }

                await this.updateUI();
                this.processing = false;
            } catch (err) {
                console.error('Collector Error:', err);
                this.processing = false;
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'time' && !this.battleEnded) {
                this.logs.push("⏳ **Battle timed out!** You stood still for too long.");
                this.battleEnded = true;
                await this.endBattle(false); 
            }
        });
    }

    async checkNextWave() {
        this.totalRewards.xp += this.enemy.expReward || 50;
        this.totalRewards.gold += this.enemy.goldReward || 20;
        
        await updateQuestProgress(this.playerDoc.userId, 'kill', this.enemy.id);

        // --- TRACK BOSS DEFEATS ---
        if (this.enemy.type === 'boss') {
            if (!this.playerDoc.defeatedBosses.includes(this.enemy.id)) {
                this.playerDoc.defeatedBosses.push(this.enemy.id);
                this.logs.push(`⭐ **EPIC VICTORY:** You have defeated **${this.enemy.name}** for the first time!`);
            }
        }

        if (this.enemy.drops) {
            for (const drop of this.enemy.drops) {
                if (Math.random() <= drop.chance) {
                    const qty = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
                    if (qty > 0) {
                        const itemData = MASTER_ITEM_MAP[drop.item];
                        const isEquippable = itemData && ['weapon', 'armor', 'chestplate', 'helmet', 'boots', 'leggings', 'sword', 'staff', 'bow', 'dagger'].includes(itemData.type.toLowerCase());
                        const uniqueRoll = Math.random();
                        const uniqueChance = this.enemy.type === 'elite' ? 0.25 : (this.enemy.type === 'boss' ? 0.5 : 0.05);

                        if (isEquippable && uniqueRoll < uniqueChance) {
                            let rarity = rollRarity();
                            if ((this.enemy.type === 'elite' || this.enemy.type === 'boss') && (rarity === 'Common' || rarity === 'Uncommon')) {
                                rarity = rollRarity(); 
                            }
                            const stars = rollStars((this.enemy.type === 'elite' || this.enemy.type === 'boss') ? 0.15 : 0);
                            const stats = generateRandomStats(itemData.stats || {}, rarity, stars);
                            let slot = 'weapon';
                            if (['armor', 'chestplate'].includes(itemData.type.toLowerCase())) slot = 'chest';
                            else if (itemData.type.toLowerCase() === 'helmet') slot = 'head';
                            const affixes = generateRandomAffixes(rarity, slot);
                            
                            const uniqueItem = this.playerDoc.addUniqueItem(itemData, rarity, stats, affixes, stars);
                            this.totalRewards.drops.push(`⭐ **${uniqueItem.name}** [${rarity}] (${stars}*)`);
                        } else {
                            this.playerDoc.addItem(drop.item, qty);
                            this.totalRewards.drops.push(`${qty}x ${itemData ? itemData.name : drop.item.replace(/_/g, ' ')}`);
                        }
                    }
                }
            }
        }

        if (this.currentWave < this.waves.length - 1) {
            const clearedWave = this.currentWave + 1;
            this.currentWave++;
            this.logs.push(`🌊 **Wave ${clearedWave} cleared!** Preparing for Wave ${this.currentWave + 1}...`);
            this.setupWave();
            await this.updateUI();
        } else {
            this.battleEnded = true;
            this.logs.push(this.isDungeon ? `🏆 **Dungeon Conquered!**` : `🏆 **Victory!**`);
            if (this.collector) this.collector.stop();
            await this.endBattle(true);
        }
    }

    handleAttack() {
        const pClass = this.playerDoc.class;
        const magicClasses = ['mage', 'paladin', 'archmage', 'spellblade', 'templar', 'crusader'];
        const isMagic = magicClasses.includes(pClass);
        const REGEN_AMOUNT = 15;

        let regenMsg = '';
        if (isMagic) {
            const oldMana = this.player.currentMana;
            this.player.currentMana = Math.min(this.player.maxMana, this.player.currentMana + REGEN_AMOUNT);
            regenMsg = ` (+${this.player.currentMana - oldMana} Mana)`;
        } else {
            const oldStam = this.player.currentStamina;
            this.player.currentStamina = Math.min(this.player.maxStamina, this.player.currentStamina + REGEN_AMOUNT);
            regenMsg = ` (+${this.player.currentStamina - oldStam} Stamina)`;
        }

        let rawDmg = this.player.atk - (this.enemy.def || 0);
        let dmg = Math.max(1, Math.floor(rawDmg));
        
        let actionStr = 'slash for';
        let emoji = '⚔️';

        if (pClass === 'mage' || pClass === 'archmage') {
            actionStr = 'blast with your staff for';
            emoji = '🔮';
        } else if (pClass === 'rogue' || pClass === 'assassin') {
            actionStr = 'stab for';
            emoji = '🗡️';
        } else if (pClass === 'paladin' || pClass === 'crusader') {
            actionStr = 'smite for';
            emoji = '✨';
        } else if (pClass === 'knight' || pClass === 'templar') {
            actionStr = 'bash with your shield for';
            emoji = '🛡️';
        } else if (pClass === 'berserker') {
            actionStr = 'recklessly hack for';
            emoji = '🪓';
        } else if (pClass === 'ranger') {
            actionStr = 'shoot for';
            emoji = '🏹';
        } else if (pClass === 'spellblade') {
            actionStr = 'strike with an enchanted blade for';
            emoji = '🌟';
        }

        let msg = `You ${actionStr} **${dmg}** dmg! ${emoji}`;

        if (Math.random() < this.player.cr_rate) {
            dmg = Math.floor(dmg * this.player.cd_mult);
            msg = `💥 **CRITICAL HIT!** You ${actionStr} **${dmg}** dmg! ${emoji}`;
        }

        this.enemy.hp -= dmg;
        if (pClass === 'rogue' || pClass === 'assassin') {
            if (Math.random() < 0.2) {
                this.applyStatus(this.enemy, { id: 'poison', name: 'Poison', emoji: '🤢', duration: 3 });
                msg += " (Applied Poison!)";
            }
        }

        const enGain = this.gainEnergy(ENERGY_GAIN_BASIC);
        this.logs.push(`🤺 ${msg}${regenMsg} (+${enGain} Energy)`);
        return true;
    }

    handleSkill(skillIndex = 0) {
        const classData = CLASSES[this.playerDoc.class];
        const skill = (classData && classData.skills && classData.skills[skillIndex]) 
            ? classData.skills[skillIndex] 
            : { 
                name: 'Struggle', 
                cost: { type: 'stamina', amount: 5 }, 
                multiplier: 1.0, 
                stat: 'atk',
                description: 'A desperate flail.'
            };

        if (skill.cost.type === 'mana') {
            if (this.player.currentMana < skill.cost.amount) {
                this.logs.push(`🚫 **Out of Mana!** Need ${skill.cost.amount} Mana.`);
                return false;
            }
            this.player.currentMana -= skill.cost.amount;
        } else if (skill.cost.type === 'stamina') {
            if (this.player.currentStamina < skill.cost.amount) {
                this.logs.push(`🚫 **Exhausted!** Need ${skill.cost.amount} Stamina.`);
                return false;
            }
            this.player.currentStamina -= skill.cost.amount;
        }

        const baseStat = this.player[skill.stat] || this.player.atk;
        let rawDmg = (baseStat * skill.multiplier) - (skill.stat === 'matk' ? (this.enemy.mdef || 0) : (this.enemy.def || 0));
        let dmg = Math.max(1, Math.floor(rawDmg));
        let msg = `used **${skill.name}** for **${dmg}** dmg!`;

        const critChance = this.player.cr_rate + (skill.bonusCrit || 0);
        if (Math.random() < critChance) {
            dmg = Math.floor(dmg * this.player.cd_mult);
            msg = `💥 **CRITICAL ${skill.name}!** Dealt **${dmg}** dmg!`;
        }

        this.enemy.hp -= dmg;

        if (skill.applyStatus && Math.random() < (skill.applyStatus.chance || 1)) {
            const target = skill.applyStatus.target === 'self' ? this.player : this.enemy;
            this.applyStatus(target, skill.applyStatus.config);
            msg += ` (Applied ${skill.applyStatus.config.name}!)`;
        }
        
        const enGain = this.gainEnergy(ENERGY_GAIN_SKILL);
        this.logs.push(`✨ ${msg} (+${enGain} Energy)`);
        return true;
    }

    handleUltimate() {
        if (!this.ultimateData) return false; 
        if (this.player.currentEnergy < this.maxEnergy) {
            this.logs.push(`🚫 **Ultimate Not Ready!** Need ${this.maxEnergy} Energy.`);
            return false;
        }
        this.player.currentEnergy = 0;

        const baseStat = this.player[this.ultimateData.stat] || this.player.atk;
        let rawDmg = (baseStat * this.ultimateData.multiplier) - (this.enemy.def || 0);
        let dmg = Math.max(1, Math.floor(rawDmg));

        this.enemy.hp -= dmg;
        this.logs.push(`🌠 **${this.ultimateData.name}** CRUSHED ENEMY for **${dmg}**!`);

        if (this.ultimateData.applyStatus) {
            this.applyStatus(this.enemy, this.ultimateData.applyStatus);
        }
        return true;
    }

    handleDefend() {
        this.player.isDefending = true;
        this.player.currentStamina = Math.min(this.player.maxStamina, this.player.currentStamina + 15);
        this.applyStatus(this.player, { id: 'regen', name: 'Regen', emoji: '💖', duration: 2 });
        this.logs.push(`🛡️ You brace yourself (+15 Stamina, +Regen).`);
        return true;
    }

    async enemyTurn() {
        if (this.battleEnded) return;

        const statusResults = await this.processStatuses(this.enemy, false);
        this.logs.push(...statusResults.logs);

        if (this.enemy.hp <= 0) {
             return this.checkNextWave();
        }

        if (statusResults.skipTurn) {
            this.isPlayerTurn = true;
            await this.updateUI();
            return;
        }

        let defense = this.player.def;
        if (this.player.isDefending) {
            defense *= 2; 
            this.player.isDefending = false; 
        }

        let rawDmg = (this.enemy.atk || 10) - defense;
        let dmg = Math.max(1, Math.floor(rawDmg));
        
        this.player.currentHp -= dmg;
        let msg = `👹 ${this.enemy.name} attacks you for **${dmg}** damage!`;

        if (Math.random() < 0.15) {
             this.applyStatus(this.player, { id: 'burn', name: 'Burn', emoji: '🔥', duration: 2 });
             msg += " (Applied Burn!)";
        }

        this.logs.push(msg);
        this.player.currentStamina = Math.min(this.player.maxStamina, this.player.currentStamina + 5);

        if (this.player.currentHp <= 0) {
            this.logs.push(`💀 **You were defeated...**`);
            this.battleEnded = true; 
            if (this.collector) this.collector.stop();
            await this.endBattle(false);
            return;
        }

        this.isPlayerTurn = true;
        await this.updateUI();
    }

    async endBattle(win) {
        if (this.isSaving) return;
        this.isSaving = true;

        const resultEmbed = new EmbedBuilder();

        if (win) {
            const xp = this.totalRewards.xp;
            const gold = this.totalRewards.gold;
            this.playerDoc.gold += gold;
            
            const classXpAmount = Math.floor(xp * 0.3);
            const playerSummary = await addExperience(this.playerDoc, xp, 'player');
            const classSummary = await addExperience(this.playerDoc, classXpAmount, 'class');

            const summary = {
                playerLevelsGained: playerSummary.playerLevelsGained,
                classLevelsGained: classSummary.classLevelsGained,
                maxClassLevelReached: classSummary.maxClassLevelReached,
                oldStats: playerSummary.oldStats, // Stats before both level-ups
                newStats: classSummary.newStats   // Stats after both level-ups
            };

            if (this.isDungeon) {
                const { generateRandomRelic } = require('../utils/relicUtils');
                const avgLevel = this.enemy.level || this.playerDoc.level;
                const relic = generateRandomRelic(avgLevel, this.enemy.type === 'boss' ? 4 : 3);
                this.playerDoc.relicInventory.push(relic);
                this.totalRewards.drops.push(`🔮 **${relic.name}** [${relic.slot.toUpperCase()}] (${relic.stars}⭐)`);
            }

            resultEmbed
                .setTitle(this.isDungeon ? '🏆 Dungeon Conquered!' : '🏆 Victory!')
                .setDescription(this.isDungeon ? 'You have cleared the dungeon waves!' : 'You were victorious in battle!')
                .setColor('#00FF00')
                .addFields(
                    { name: 'Total Experience', value: `✨ +${xp} XP\n🛡️ +${classXpAmount} Class XP`, inline: true },
                    { name: 'Total Gold', value: `💰 +${gold} Gold`, inline: true }
                );

            if (this.totalRewards.drops.length > 0) {
                const uniqueDrops = this.totalRewards.drops.filter(d => d.startsWith('⭐'));
                const standardDrops = this.totalRewards.drops.filter(d => !d.startsWith('⭐'));
                const relicDrops = this.totalRewards.drops.filter(d => d.startsWith('🔮'));
                
                let dropStr = '';
                if (uniqueDrops.length > 0) dropStr += `**Unique Drops:**\n${uniqueDrops.join('\n')}\n`;
                if (relicDrops.length > 0) dropStr += `**Relics:**\n${relicDrops.join('\n')}\n`;
                if (standardDrops.length > 0) dropStr += `**Materials:**\n${standardDrops.join('\n')}`;
                
                resultEmbed.addFields({ name: '📦 Loot Obtained', value: dropStr || 'None', inline: false });
            }

            const LevelUpVisuals = require('../utils/LevelUpVisuals');
            if (summary.playerLevelsGained > 0 || summary.classLevelsGained > 0) {
                // If both leveled up, we might want a merged summary. 
                // addExperience for 'player' returns the stats.
                this.levelUpEmbed = LevelUpVisuals.createLevelUpEmbed(this.playerDoc, summary);
            }

            if (summary.maxClassLevelReached) {
                 resultEmbed.addFields({ name: '🌟 CLASS MASTERY!', value: `You reached **Level 20**! Use \`/class\` to ascend.`, inline: false });
                 resultEmbed.setColor('#FFD700'); 
            }

        } else {
            const goldLoss = Math.floor(this.playerDoc.gold * 0.05);
            this.playerDoc.gold = Math.max(0, this.playerDoc.gold - goldLoss);
            this.playerDoc.stats.hp = Math.floor(this.player.maxHp * 0.15); 

            resultEmbed
                .setTitle('💀 Defeat...')
                .setDescription(`You were defeated.\nYou crawl away to recover...`)
                .setColor('#FF0000')
                .addFields(
                    { name: 'Status', value: 'Revived with 15% HP', inline: true },
                    { name: 'Penalty', value: `💰 -${goldLoss} Gold (5%)`, inline: true }
                );
        }
        
        this.playerDoc.stats.hp = Math.max(0, Math.floor(this.player.currentHp));
        this.playerDoc.stats.stamina = Math.max(0, Math.floor(this.player.currentStamina));
        this.playerDoc.stats.mana = Math.max(0, Math.floor(this.player.currentMana));
        this.playerDoc.stats.energy = this.player.currentEnergy;
        this.playerDoc.inCombat = false;

        if (this.isDungeon) {
            this.playerDoc.currentPlace = null;
        }

        if (this.playerDoc.buffs && this.playerDoc.buffs.length > 0) {
            for (let i = this.playerDoc.buffs.length - 1; i >= 0; i--) {
                const b = this.playerDoc.buffs[i];
                if (b.durationBattles > 0) {
                    b.durationBattles--;
                    if (b.durationBattles <= 0 && !b.expiresAt) {
                        this.playerDoc.buffs.splice(i, 1);
                    }
                }
            }
        }

        try {
            await this.playerDoc.save();
            const embeds = [resultEmbed];
            if (this.levelUpEmbed) embeds.push(this.levelUpEmbed);
            if (this.tutorialEmbed) embeds.push(...this.tutorialEmbed);
            await this.interaction.editReply({ embeds, components: [] }).catch(() => {});
        } catch (e) {
            console.error("Battle Save Error:", e);
        } finally {
            this.isSaving = false;
        }
    }
}

module.exports = CombatManager;