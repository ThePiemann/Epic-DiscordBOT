const { expect } = require('chai');
const { 
    calculateEffectiveStats, 
    calculateBaseStats, 
    applyAllocatedStats, 
    applyEquipmentBonuses, 
    applyRelicBonuses 
} = require('../src/systems/stats');

describe('Stats System', () => {
    let mockUser;

    beforeEach(() => {
        mockUser = {
            level: 1,
            classLevel: 1,
            class: 'warrior',
            stats: {
                hp: 120, maxHp: 120,
                atk: 15, def: 8,
                matk: 10, mdef: 8,
                spd: 10,
                stamina: 100, maxStamina: 100,
                mana: 60, maxMana: 60,
                energy_regen: 100
            },
            allocatedStats: { str: 0, int: 0, dex: 0, con: 0 },
            equipment: new Map(),
            relicEquipment: new Map(),
            uniqueInventory: [],
            relicInventory: []
        };
    });

    describe('calculateBaseStats', () => {
        it('should calculate base stats at level 1 for warrior', () => {
            const stats = calculateBaseStats(mockUser);
            // Warrior growth: maxHp: 12, atk: 2.2, def: 1.2
            // Warrior bonusStats: maxHp: 20, atk: 5, def: 5
            // maxHp: 100 + (1-1)*3 + (1-1)*12 + 20 = 120
            expect(stats.maxHp).to.equal(120);
            // atk: 10 + (1*0.5) + (1*2.2) + 5 = 17.7
            expect(stats.atk).to.be.closeTo(17.7, 0.01);
        });

        it('should scale with player and class level', () => {
            mockUser.level = 2;
            mockUser.classLevel = 2;
            const stats = calculateBaseStats(mockUser);
            // maxHp: 100 + (2-1)*3 + (2-1)*12 + 20 = 135
            expect(stats.maxHp).to.equal(135);
        });
    });

    describe('applyAllocatedStats', () => {
        it('should add stats based on STR', () => {
            let stats = { atk: 10, def: 5 };
            const allocated = { str: 10, int: 0, dex: 0, con: 0 };
            stats = applyAllocatedStats(stats, allocated);
            // atk: 10 + (10 * 1.5) = 25
            expect(stats.atk).to.equal(25);
            // def: 5 + (10 * 1) = 15
            expect(stats.def).to.equal(15);
        });

        it('should add stats based on CON', () => {
            let stats = { maxHp: 100, maxStamina: 100 };
            const allocated = { str: 0, int: 0, dex: 0, con: 10 };
            stats = applyAllocatedStats(stats, allocated);
            // maxHp: 100 + (10 * 8) = 180
            expect(stats.maxHp).to.equal(180);
            // maxStamina: 100 + (10 * 2) = 120
            expect(stats.maxStamina).to.equal(120);
        });
    });

    describe('applyEquipmentBonuses', () => {
        it('should apply weapon attack', () => {
            let stats = { atk: 10 };
            const equipment = new Map([['weapon', 'starter_sword']]);
            // starter_sword typically has baseAttack: 5
            stats = applyEquipmentBonuses(stats, equipment, []);
            expect(stats.atk).to.be.greaterThan(10);
        });

        it('should apply percent bonuses from unique items', () => {
            let stats = { atk: 100 };
            const equipment = new Map([['weapon', 'unique_id_123']]);
            const uniqueInventory = [{
                instanceId: 'unique_id_123',
                itemId: 'starter_sword',
                stats: { atk: 10 },
                affixes: [{ stat: 'atk', value: 10, type: 'percent' }]
            }];
            stats = applyEquipmentBonuses(stats, equipment, uniqueInventory);
            // Flat: 100 + 10 = 110
            // Percent: 110 * (1 + 0.10) = 121
            expect(stats.atk).to.be.closeTo(121, 0.01);
        });
    });

    describe('applyRelicBonuses', () => {
        it('should apply main and sub stats from relics', () => {
            let stats = { maxHp: 1000, atk: 100 };
            const relicEquipment = new Map([['ring', 'relic_1']]);
            const relicInventory = [{
                instanceId: 'relic_1',
                setId: 'none',
                mainStat: { stat: 'hp', value: 200 },
                subStats: [{ stat: 'atk', value: 15 }]
            }];
            stats = applyRelicBonuses(stats, relicEquipment, relicInventory);
            expect(stats.maxHp).to.equal(1200);
            expect(stats.atk).to.equal(115);
        });

        it('should apply set bonuses (2-piece)', () => {
            let stats = { atk: 100 };
            const relicEquipment = new Map([
                ['ring', 'r1'],
                ['necklace', 'r2']
            ]);
            const relicInventory = [
                { instanceId: 'r1', setId: 'gladiators_resolve', mainStat: { stat: 'hp', value: 0 }, subStats: [] },
                { instanceId: 'r2', setId: 'gladiators_resolve', mainStat: { stat: 'hp', value: 0 }, subStats: [] }
            ];
            stats = applyRelicBonuses(stats, relicEquipment, relicInventory);
            // gladiators_resolve 2-piece: +18% ATK
            expect(stats.atk).to.be.closeTo(118, 0.01);
        });
    });

    describe('calculateEffectiveStats', () => {
        it('should integrate all systems', () => {
            mockUser.level = 1;
            mockUser.allocatedStats.str = 10;
            const stats = calculateEffectiveStats(mockUser);
            // Base Atk (17.7) + STR (15) = 32.7
            expect(stats.atk).to.be.closeTo(32.7, 0.01);
        });
    });
});