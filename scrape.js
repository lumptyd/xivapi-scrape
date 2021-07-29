const xivApi = require('@xivapi/js');
const fs = require('fs');



async function sleep(millis) {
  return new Promise(resolve => setTimeout(resolve, millis));
}

async function scrapeAction(api, query) {
  const results = [];

  let loops = 1;
  console.log('Beginning Scrape for:', query.indexes);

  do {
    var response = await api.search(query);
    results.push(...response.Results);
    query.body.from += response.Pagination.Results;

    console.log('Processing results, running total:', query.body.from);
    if (loops >= response.Pagination.PageTotal + 1) {
      break;
    }

    // Failsafe
    loops++;
    await sleep(1000);
  } while (response.Pagination.PageNext !== null)

  return results;
}

(async () => {
  const api = new xivApi({

  });

  const skillQuery = {
    indexes: 'action',
    columns: 'ID,Url,IsPvP,IsPlayerAction,ActionCategory,ActionCombo,ClassJobCategory,Icon,IconHD,IsRoleAction,MaxCharges,Name,PreservesCombo,PrimaryCostType,PrimaryCostValue,Range,Recast100ms,SecondaryCostType,SecondaryCostValue,StatusGainSelf,StatusGainSelfTarget,StatusGainSelfTargetId,CastType,Cast100ms',
    body: {
      from: 0,
      size: 100,
      query: {
        bool: {
          filter: [
            {
              range: {
                'ActionCategory.ID': {
                  gte: "2"
                }
              }
            },
            {
              range: {
                'ActionCategory.ID': {
                  lte: "4"
                }
              }
            },
            {
              range: {
                'IsPvP': {
                  lte: "0"
                }
              }
            }
          ],
          must: [
            [
              {
                exists: {
                  field: "ClassJobCategory"
                }
              }
            ]
          ]
        }
      }
    }
  };

  const statusQuery = {
    indexes: 'status',
    columns: 'ID,Category,Icon,IconHD,IconID,Name',
    body: {
      from: 0,
      size: 100,
      query: {
        bool: {
          must: [
            [
              {
                exists: {
                  field: "HitEffect"
                }
              }
            ]
          ]
        }
      }
    }
  };

  const itemQuery = {
    indexes: 'action',
    columns: 'ID,Url,ActionCategory,ActionCombo,ClassJobCategory,Icon,IconHD,IsRoleAction,MaxCharges,Name,PreservesCombo,PrimaryCostType,PrimaryCostValue,Range,Recast100ms,SecondaryCostType,SecondaryCostValue,StatusGainSelf,StatusGainSelfTarget,StatusGainSelfTargetId,CastType,Cast100ms',
    body: {
      from: 0,
      size: 100,
      query: {
        bool: {
          must: [
            [
              {
                exists: {
                  field: "ClassJobCategory"
                }
              },
              {
                term: {
                  "ActionCategory.ID": "5"
                }
              }
            ]
          ]
        }
      }
    }
  };

  let skillResults = null;
  let statusResults = null;
  let itemResults = null;

  try {
    skillResults = await scrapeAction(api, skillQuery);
    //statusResults = await scrapeAction(api, statusQuery);
    //itemResults = await scrapeAction(api, itemQuery);
  } catch (error) {
    console.error(error);
    return;
  }


  try {
    fs.mkdirSync(process.cwd() + '/data', { recursive: true });
    fs.writeFileSync(process.cwd() + '/data/skills.json', JSON.stringify(skillResults, null, 2));
    //fs.writeFileSync(process.cwd() + '/data/statuses.json', JSON.stringify(statusResults, null, 2));
    //fs.writeFileSync(process.cwd() + '/data/itemSkills.json', JSON.stringify(itemResults, null, 2));

  } catch (error) {
    console.log(error);
  }

  console.log("Scrape completed.");
})();
