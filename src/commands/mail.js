const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');
const { MASTER_ITEM_MAP } = require('../data/shopItems');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mail')
        .setDescription('Check your mailbox and claim rewards.')
        .addSubcommand(sub =>
            sub.setName('inbox')
                .setDescription('View your incoming messages and rewards.')
        )
        .addSubcommand(sub =>
            sub.setName('claim')
                .setDescription('Claim items or gold from a specific message.')
                .addIntegerOption(opt => opt.setName('index').setDescription('The # of the mail to claim').setRequired(true).setAutocomplete(true))
        )
        .addSubcommand(sub =>
            sub.setName('send')
                .setDescription('Send a message with gold or items to another player.')
                .addUserOption(opt => opt.setName('user').setDescription('Recipient').setRequired(true))
                .addStringOption(opt => opt.setName('message').setDescription('Your message').setRequired(true))
                .addIntegerOption(opt => opt.setName('gold').setDescription('Amount of gold to send').setRequired(false))
                .addStringOption(opt => opt.setName('item').setDescription('Item ID to send').setRequired(false).setAutocomplete(true))
                .addIntegerOption(opt => opt.setName('amount').setDescription('Quantity of the item').setRequired(false))
                .addStringOption(opt => opt.setName('alert').setDescription('Send a DM notification?').setRequired(false).addChoices({ name: 'Yes', value: 'yes' }, { name: 'No', value: 'no' }))
        ),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const sub = interaction.options.getSubcommand();

        if (sub === 'send' && focusedOption.name === 'item') {
            const focusedValue = focusedOption.value.toLowerCase();
            const user = await User.findOne({ userId: interaction.user.id }).select('inventory').lean();
            if (!user || !user.inventory) return interaction.respond([]);

            const choices = [];
            const inventoryEntries = user.inventory instanceof Map ? user.inventory.entries() : Object.entries(user.inventory);

            for (const [itemId, qty] of inventoryEntries) {
                const item = MASTER_ITEM_MAP[itemId];
                const name = item ? item.name : itemId;
                if (name.toLowerCase().includes(focusedValue) || itemId.toLowerCase().includes(focusedValue)) {
                    choices.push({ name: `${name} (x${qty})`, value: itemId });
                }
            }
            return interaction.respond(choices.slice(0, 25));
        }

        if (sub === 'claim' && focusedOption.name === 'index') {
            const focusedValue = focusedOption.value.toLowerCase();
            const user = await User.findOne({ userId: interaction.user.id }).select('mailbox').lean();
            if (!user || !user.mailbox || user.mailbox.length === 0) return interaction.respond([]);

            const choices = user.mailbox.map((mail, index) => {
                let label = `[${index + 1}] From: ${mail.sender}`;
                let rewardText = [];
                if (mail.gold > 0) rewardText.push(`💰 ${mail.gold}g`);
                if (mail.attachments && mail.attachments.length > 0) {
                    const att = mail.attachments[0];
                    const itemData = MASTER_ITEM_MAP[att.id];
                    const itemName = itemData ? itemData.name : att.id.replace(/_/g, ' ');
                    rewardText.push(`📦 ${att.amount}x ${itemName}`);
                }
                if (rewardText.length > 0) label += ` (${rewardText.join(', ')})`;
                
                if (label.length > 100) label = label.substring(0, 97) + '...';
                
                return { name: label, value: index + 1 };
            });

            const filtered = choices.filter(choice => 
                choice.name.toLowerCase().includes(focusedValue) || 
                choice.value.toString() === focusedValue
            ).slice(0, 25);

            await interaction.respond(filtered);
        }
    },

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const sub = interaction.options.getSubcommand();
        const user = await User.findOne({ userId: interaction.user.id });

        if (!user) return interaction.editReply('Use `/start` first!');

        // --- SEND ---
        if (sub === 'send') {
            const targetUser = interaction.options.getUser('user');
            const message = interaction.options.getString('message');
            const gold = interaction.options.getInteger('gold') || 0;
            const itemId = interaction.options.getString('item');
            const amount = interaction.options.getInteger('amount') || 1;
            const alert = interaction.options.getString('alert') || 'yes';

            if (targetUser.id === interaction.user.id) return interaction.editReply("You can't mail yourself.");
            if (targetUser.bot) return interaction.editReply("Bots don't have mailboxes.");

            const recipient = await User.findOne({ userId: targetUser.id });
            if (!recipient) return interaction.editReply("Recipient not found.");

            // Validation
            if (gold < 0) return interaction.editReply("Invalid gold amount.");
            if (user.gold < gold) return interaction.editReply(`❌ You don't have ${gold}g.`);

            const attachments = [];
            if (itemId) {
                const itemData = findItem(itemId);
                if (!itemData) return interaction.editReply("❌ Invalid item. Please select an item from your inventory.");
                
                const actualId = itemData.id;
                const userQty = user.inventory.get(actualId) || 0;
                if (userQty < amount) return interaction.editReply(`❌ You don't have ${amount}x ${itemData.name}.`);
                
                attachments.push({ id: actualId, amount: amount });
            }

            // Deduct assets
            if (gold > 0) user.gold -= gold;
            if (attachments.length > 0) {
                user.removeItem(attachments[0].id, attachments[0].amount);
            }
            await user.save();

            // Send
            recipient.mailbox.push({
                sender: user.username,
                content: message,
                gold: gold,
                attachments: attachments,
                date: new Date()
            });
            await recipient.save();

            // 📬 Notify recipient via DM
            if (alert === 'yes') {
                try {
                    const notifyEmbed = new EmbedBuilder()
                        .setTitle('📬 You\'ve Got Mail!')
                        .setDescription(`**${user.username}** has sent you a message in **Everlasting Journey**!`)
                        .addFields({ name: 'Message', value: `"${message}"` })
                        .setColor('#3498db')
                        .setFooter({ text: 'Use /mail inbox to check your rewards.' });

                    await targetUser.send({ embeds: [notifyEmbed] });
                } catch (dmError) {
                    console.log(`Could not send DM to ${targetUser.tag}: DMs might be disabled.`);
                }
            }

            return interaction.editReply(`✅ Mail sent to **${targetUser.username}**!`);
        }

        // --- INBOX ---
        if (sub === 'inbox') {
            if (!user.mailbox || user.mailbox.length === 0) {
                return interaction.editReply("📭 Your mailbox is empty.");
            }

            const embed = new EmbedBuilder()
                .setTitle('📬 Mailbox')
                .setColor('#3498db');

            let desc = '';
            user.mailbox.forEach((mail, index) => {
                let attachStr = '';
                if (mail.gold > 0) attachStr += `💰 ${mail.gold}g `;
                if (mail.attachments && mail.attachments.length > 0) {
                    const i = mail.attachments[0];
                    attachStr += `📦 ${i.amount}x ${i.id}`;
                }
                
                desc += `**[${index + 1}] From: ${mail.sender}**\n"${mail.content}"\n${attachStr ? `📎 ${attachStr}` : ''}\n\n`;
            });

            embed.setDescription(desc.substring(0, 4096));
            embed.setFooter({ text: 'Use /mail claim <index> to get attachments.' });
            return interaction.editReply({ embeds: [embed] });
        }

        // --- CLAIM ---
        if (sub === 'claim') {
            const index = interaction.options.getInteger('index') - 1; // User inputs 1-based index
            
            if (!user.mailbox || !user.mailbox[index]) {
                return interaction.editReply("❌ Invalid mail index.");
            }

            const mail = user.mailbox[index];
            let claimed = false;

            if (mail.gold > 0) {
                user.gold += mail.gold;
                claimed = true;
            }

            if (mail.attachments && mail.attachments.length > 0) {
                mail.attachments.forEach(att => {
                    user.addItem(att.id, att.amount);
                });
                claimed = true;
            }

            // Remove mail after claim
            user.mailbox.splice(index, 1);
            await user.save();

            return interaction.editReply(`✅ Claimed contents from **${mail.sender}** and deleted the message.`);
        }
    }
};