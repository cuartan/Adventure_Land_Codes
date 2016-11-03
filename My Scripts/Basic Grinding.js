//Version 1.5.0

var mode = 0; //kite (move in straight line while attacking) [default] = 0, standing still (will move if target is out of range) = 1, circle kite (walks in circles around enemy) = 2, Front of target (Moves to front of target before attacking) = 3, Don't Move at all (will not move even if target is out of range) = 4
var targetting = 2; //Monster Range  = 0, Character Range = 1, Tank Range[default] = 2
var till_level = 0; // Kills till level = 0, XP till level = 1
var min_xp_from_mob = 1000; //set to minimum xp you want to be getting from each kill -- lowest amount of xp a mob has to have to be attacked
var max_att_from_mob = 100; //set to maximum damage you want to take from each hit -- most attack you're willing to fight
var min_xp_from_mob2 = 500; //set to minimum xp you want to be getting from each kill if can't find min from first target -- lowest amount of xp a mob has to have to be attacked
var max_att_from_mob2 = 50; //set to maximum damage you want to take from each hit if can't find max from first target -- most attack you're willing to fight
//Main Settings

var prevx = 0;
var prevy = 0;
//Previous coords

var angle;
var flipcd = 0;
var stuck = 1;
//Distance Maintainence Variables

//show_json(character);
//show_json(get_targeted_monster());
//show_json(parent.M);
//JSONs

var purchase_pots = false; //Set to true in order to allow potion purchases
var buy_hp = false; //Set to true in order to allow hp potion purchases
var buy_mp = false; //Set to true in order to allow mp potion purchases
var hp_potion = 'hpot0'; //+200 HP Potion = 'hpot0', +400 HP Potion = 'hpot1' [always keep '' around it]
var mp_potion = 'mpot0'; //+300 MP Potion = 'mpot0', +500 MP Potion = 'mpot1' [always keep '' around it]
var pots_minimum = 50; //If you have less than this, you will buy
var pots_to_buy = 1000; //This is how many you will buy
//Automatic Potion Purchasing!

//Grind Code below --------------------------
setInterval(function() {

  //Updates GUI for Till_Level/Gold
  updateGUI();

  //Purchases Potions when below threshold
  if (purchase_pots) {
    purchase_potions(buy_hp, buy_mp);
  }

  //Heal and restore mana if required
  if (character.hp / character.max_hp < 0.3 && new Date() > parent.next_potion) {
    parent.use('hp');
    if (character.hp <= 100)
      parent.socket.emit("transport", {
        to: "main"
      });
    //Panic Button
  }

  if (character.mp / character.max_mp < 0.3 && new Date() > parent.next_potion)
    parent.use('mp');
  //Constrained Healing

  loot();
  //Loot Chests

  var charx = character.real_x;
  var chary = character.real_y;
  //Character Location

  var target = get_targeted_monster();
  if (!target || (target.target && target.target != character.name)) {
    target = get_nearest_available_monster({
      min_xp: min_xp_from_mob,
      max_att: max_att_from_mob,
      no_attack: true
    });
    if (target) {
      change_target(target);
      angle = Math.atan2(target.real_y - chary, target.real_x - charx);
    } else if (!target) {
      target = get_nearest_available_monster({
        min_xp: min_xp_from_mob2,
        max_att: max_att_from_mob2
      });
      if (target) {
        change_target(target);
        angle = Math.atan2(target.real_y - chary, target.real_x - charx);
      } else {
        set_message("No Monsters");
        return;
      }
    }
  }
  //Monster Searching

  var enemydist;
  if (targetting === 0)
    enemydist = parent.G.monsters[target.mtype].range + 5;
  else if (targetting == 1)
    enemydist = character.range - 10;
  else
    enemydist = 30;
  //Targetting

  if (can_attack(target))
    attack(target);
  set_message("Attacking: " + target.mtype);
  //Attack

  /*  var parmem = get_nearest_solo_player();
    if (parmem)
      parent.socket.emit("party", {
        event: 'invite',
        id: parmem.id
      });
    //Invite to Party */

  var distx = target.real_x - charx;
  var disty = target.real_y - chary;
  if (!angle && target)
    angle = Math.atan2(disty, distx);
  //Enemy Distance and Angle


  if (mode === 0) {
    if (distx > 0) //Player is left of enemy
      move(target.real_x - enemydist, chary);
    if (distx < 0) //Player is right of enemy
      move(target.real_x + enemydist, chary);
    if (disty > 0) //Player is below enemy
      move(charx, target.real_y - enemydist);
    if (disty < 0) //Player is above enemy
      move(charx, target.real_y + enemydist);
  } else if (mode == 1) {
    if (!in_attack_range(target)) {
      move(
        character.real_x + (target.real_x - character.real_x) / 2,
        character.real_y + (target.real_y - character.real_y) / 2
      );
    }
    // Walk half the distance
  } else if (mode == 2) {
    var chx = charx - prevx;
    var chy = chary - prevy;
    var distmov = Math.sqrt(chx * chx + chy * chy);

    if (distmov < stuck)
      angle = angle + Math.PI * 2 * 0.125;
    if (parent.distance(character, target) <= enemydist && flipcd > 18) {
      angle = angle + Math.PI * 2 * 0.35;
      flipcd = 0;
    }
    flipcd++;
    //Stuck Code

    var new_x = target.real_x + enemydist * Math.cos(angle);
    var new_y = target.real_y + enemydist * Math.sin(angle);
    move(new_x, new_y);
    //Credit to /u/idrum4316
  } else if (mode == 3) {
    move(target.real_x, target.real_y + 5);
  } else if (mode == 4) {}
  //Following/Maintaining Distance

  prevx = Math.ceil(charx);
  prevy = Math.ceil(chary);
  //Sets new coords to prev coords

}, 200); // Loop Delay

function purchase_potions(buyHP, buyMP) {
  let [hpslot, hppot] = find_item(i => i.name == hp_potion);
  let [mpslot, mppot] = find_item(i => i.name == mp_potion);

  if (buyHP && (!hppot || hppot.q < pots_minimum)) {
    parent.buy(hp_potion, pots_to_buy);
    set_message("Buying HP pots.");
  }
  if (buyMP && (!mppot || mppot.q < pots_minimum)) {
    parent.buy(mp_potion, pots_to_buy);
    set_message("Buying MP pots.");
  }
}

function find_item(filter) {
  for (let i = 0; i < character.items.length; i++) {
    let item = character.items[i];

    if (item && filter(item))
      return [i, character.items[i]];
  }

  return [-1, null];
}

function isBetween(num, compare, range) {
  return num >= compare - range && num <= compare + range;
}

function get_nearest_solo_player() {
  var min_d = 999999,
    target = null;
  for (var id in parent.entities) {
    var current = parent.entities[id];
    if (current.player === false || current.dead || current.party)
      continue;
    var c_dist = parent.distance(character, current);
    if (c_dist < min_d)
      min_d = c_dist, target = current;
    else if (current.player === true)
      target = current;
  }
  return target;
  //Credit to /u/Sulsaries
}

function get_nearest_available_monster(args) {
  var min_d = 400,
    target = null;
  for (id in parent.entities) {
    var current = parent.entities[id];
    if (current.type != "monster" || args.min_xp && current.xp < args.min_xp || args.max_att && current.attack > args.max_att || current.dead || (current.target && current.target != character.name)) continue;
    if (args.no_target && current.target && current.target != character.name) continue;
    var c_dist = parent.distance(character, current);
    if (c_dist < min_d) min_d = c_dist, target = current;
  }
  return target;
}

//GUI Stuff
var skills = {
  'charge': {
    display: 'Charge',
    cooldown: 40000
  },
  'taunt': {
    display: 'Taunt',
    cooldown: 6000
  },
  'supershot': {
    display: 'Super Shot',
    cooldown: 30000
  },
  'curse': {
    display: 'Curse',
    cooldown: 5000
  },
  'invis': {
    display: 'Stealth',
    cooldown: 12000,
    start: () => new Promise((res) => {
      let state = 0;
      let watcher_interval = setInterval(() => {
        if (state == 0 && character.invis) state = 1;
        else if (state == 1 && !character.invis) state = 2;

        if (state == 2) {
          clearInterval(watcher_interval);
          res();
        }
      }, 10);
    })
  }
};

var p = parent;

function create_cooldown(skill) {
  let $ = p.$;

  let cd = $('<div class="cd"></div>').css({
    background: 'black',
    border: '5px solid gray',
    height: '30px',
    position: 'relative',
    marginTop: '5px',
  });

  let slider = $('<div class="cdslider"></div>').css({
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    background: 'green',
    border: '2px solid black',
    boxSizing: 'border-box',
  });

  let text = $(`<span class="cdtext">${skill}</div>`).css({
    width: '100%',
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: '30px',
    position: 'relative',
  });

  cd.append(slider);
  cd.append(text);

  return cd;
}

var cooldowns = [];

function manage_cooldown(skill) {
  let $ = p.$;

  let skill_info = skills[skill];

  if (!skill_info || cooldowns.includes(skill)) return;
  cooldowns.push(skill);

  let start = skill_info.start ? skill_info.start() : Promise.resolve();

  let el = create_cooldown(skill_info.display);
  $('#cdcontainer').append(el);

  start.then(() => {
    el.find('.cdslider').animate({
      width: '4px'
    }, skill_info.cooldown, 'linear', () => {
      el.remove();
      cooldowns.splice(cooldowns.indexOf(skill), 1);
    });
  });
}

function initGUI() {
  let $ = p.$;

  if (p.original_emit) p.socket.emit = p.original_emit;

  $('#cdcontainer').remove();

  let mid = $('#bottommid');
  let cd_container = $('<div id="cdcontainer"></div>').css({
    width: '360px',
    position: 'absolute',
    bottom: '90px',
    right: 0,
    left: 0,
    margin: 'auto'
  });

  mid.append(cd_container);

  p.original_emit = p.socket.emit;

  p.socket.emit = function(event, args) {
    if (parent && event == 'ability') {
      manage_cooldown(args.name);
    }
    p.original_emit.apply(this, arguments);
  };

  let brc = $('#bottomrightcorner');
  $('#xpui').css({
    fontSize: '28px',
  });

  brc.find('.xpsui').css({
    background: 'url("https://i.imgur.com/zCb8PGK.png")',
    backgroundSize: 'cover'
  });

  brc.find('#goldui').remove();
  let gb = $('<div id="goldui"></div>').css({
    background: 'black',
    border: 'solid gray',
    borderWidth: '0 5px',
    height: '34px',
    lineHeight: '34px',
    fontSize: '30px',
    color: '#FFD700',
    textAlign: 'center',
  });
  gb.insertBefore($('#gamelog'));
}

var last_target = null;

if (till_level === 0)

function updateGUI() {
  let $ = p.$;
  let xp_percent = ((character.xp / p.G.levels[character.level]) * 100).toFixed(2);
  let xp_string = `LV${character.level} ${xp_percent}%`;
  if (p.ctarget && p.ctarget.type == 'monster') {
    last_target = p.ctarget.mtype;
  }
  if (last_target) {
    let xp_missing = p.G.levels[character.level] - character.xp;
    let monster_xp = p.G.monsters[last_target].xp;
    let party_modifier = character.party ? 1.5 / p.party_list.length : 1;
    let monsters_left = Math.ceil(xp_missing / (monster_xp * party_modifier * character.xpm));
    xp_string += ` (${ncomma(monsters_left)} kills to go!)`;
  }
  $('#xpui').html(xp_string);
  $('#goldui').html(ncomma(character.gold) + " GOLD");
} else if (till_level === 1)

function updateGUI() {
  let $ = p.$;
  let xp_percent = ((character.xp / G.levels[character.level]) * 100).toFixed(2);
  let xp_missing = ncomma(G.levels[character.level] - character.xp);
  let xp_string = `LV${character.level} ${xp_percent}% (${xp_missing}) xp to go!`;
  $('#xpui').html(xp_string);
  $('#goldui').html(ncomma(character.gold) + " GOLD");
}

function ncomma(x) {
  let number = x.toString();
  let result = [];
  while (number.length > 3) {
    result.unshift(number.slice(-3));
    number = number.slice(0, -3);
  }
  result.unshift(number);
  return result.join(',');
}

initGUI();

//Unusable:
//sleep()
//while loops
