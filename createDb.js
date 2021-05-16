const skills = require('./data/skills.json');
const axios = require('axios');
const fs = require('fs');

async function sleep(millis) {
  return new Promise(resolve => setTimeout(resolve, millis));
}

async function download(url, pathToSave) {
  const response = await axios({ url, responseType: 'stream' });
  const prom = new Promise((resolve, reject) => {
    response.data.pipe(fs.createWriteStream(pathToSave))
      .on('finish', () => resolve())
      .on('error', e => reject(e));
  });

  return prom;
}

const apiUrl = "http://xivapi.com";
const pathAppend = process.cwd() + '/data/images';
const convertedPath = process.cwd() + '/data/skillDb.json';

(async () => {
  const excludedJobs = ['ALC', 'BLU', 'BSM', 'BTN', 'CRP', 'CUL', 'FSH', 'GSM', 'LTW', 'MIN', 'WVR', 'ARM'];
  const jobSpecificSkills = skills.filter(sk => {
    return sk.ClassJobCategory
      && !sk.IsPvP
      && sk.ClassJobCategory.Name !== 'All Classes'
      && sk.ClassJobCategory.Name !== 'Disciple of the Land'
      && sk.ClassJobCategory.Name !== 'Disciple of the Hand'
      && !(sk.ClassJobCategory.Name.length === 3 && excludedJobs.includes(sk.ClassJobCategory.Name))
      && !(sk.ClassJobCategory.Name.split(' ').length > 3 && sk.IsRoleAction !== 1);
  });

  fs.mkdirSync(pathAppend, { recursive: true });
  const convertedResults = [];

  console.log('Parsing skills from json. Downloading and converting:', jobSpecificSkills.length);

  for (let i = 0; i < jobSpecificSkills.length; i++) {
    const skill = jobSpecificSkills[i];
    const iconUrl = apiUrl + skill.IconHD;
    const iconPath = pathAppend + '/' + skill.ID.toString(16) + '.png';
    const mapped = {
      name: skill.Name,
      id: skill.ID.toString(16).toLowerCase(),
      job: skill.ClassJobCategory.Name.split(' ').filter(name => !excludedJobs.includes(name)),
      isOGCD: skill.ActionCategory.ID === 4,
      timer: skill['Cast100ms'] * 100,
      cooldown: skill['Recast100ms'] * 100,
      type: skill.ActionCategory.ID,
      requirements: [],
      stocks: Math.max(1, skill.MaxCharges),
      range: Number(skill.Range),
      preservesCombo: skill.PreservesCombo > 0,
      combos: skill.ActionCombo !== null,
      comboSkillId: skill.ActionCombo?.ID.toString(16)
    };

    if (skill.PrimaryCostType > 0) {
      mapped.requirements.push({
        resourceType: skill.PrimaryCostType,
        value: skill.PrimaryCostValue
      });
    }

    if (skill.SecondaryCostType > 0) {
      mapped.requirements.push({
        resourceType: skill.SecondaryCostType,
        value: skill.SecondaryCostValue
      });
    }

    convertedResults.push(mapped);
    console.log(iconUrl);
    try {
      await download(iconUrl, iconPath);
    } catch (error) {
      console.error(iconUrl, error);
      await download(iconUrl, iconPath);
    }
    await sleep(70);
  }
  fs.writeFileSync(convertedPath, JSON.stringify(convertedResults, null, 2));

})();