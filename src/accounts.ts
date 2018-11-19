import * as geoip from 'geoip-lite' // https://www.npmjs.com/package/geoip-lite

import * as utils from './utils';
import * as _ from 'lodash';

var dbglobal:any;

export function midware(db: any) {
  dbglobal = db;
  return function (req: any, res: any, next: any) {  
    
    
    if (req.headers.authorization) {
      
      var auth = Buffer.from(req.headers.authorization.split(" ")[1], 'base64').toString()
      
      if (auth.split(":")[0] == "api") {
        var apiAuth = auth.split(":")[1];
        var apikey = apiAuth.split("-")[1]
        
        
 
        db.users.findOne({ apikey: apikey }, (err: Error, user: any) => {
          if (user) {
            req.user = user;
            next();
          } else {
            next();
          }
        });
      } else {
        res.json({error:"Authorization header invalid"})
        return;
      }


    } else {
      if (req.cookies) {
        
        if (!req.cookies.uuid) {
          
          accountCreate(db, "", req.get('User-Agent'), req.ip, (err:Error, user:any) => {
            if (err) { next(); } else { cookieSetFromUser(user, req, res, next);  }          
          },undefined)
  
        } else {
          db.users.findOne({ uuid: req.cookies.uuid }, (err: any, user: any) => {
            if (user) {
              req.user = user;
              next();
            } else {
              console.log("ERROR USER NOT FOUND IN DB")
              res.clearCookie('uuid');
              
              accountCreate(db, "", req.get('User-Agent'), req.ip, (err:Error, user:any) => {
                if (err) { next(); } else { cookieSetFromUser(user, req, res, next);  }          
              },undefined)
  
            }
          })
        }
      } else {
        console.log("ERROR NO COOKIE MIDDLEWARE?")
      }
    }


    ////
  }
}

export function cookieSetFromUser(user:any, req:any, res:any, next:any) {
  var expiryDate = new Date(Number(new Date()) + 315360000000);  //10 years
  res.cookie('uuid', user.uuid, { expires: expiryDate, httpOnly: true });
  req.user = user;
  next();
}



export function signInFromWeb(db: any) {
  return function(req: any, res: any, next: any) {

    

    if (req.body) {
      console.log(req.body)
      if (req.body.email) {
        
        if (validateEmail(req.body.email) && req.body.pass) {
          
          db.users.findOne(
            { email: req.body.email.toLowerCase(), password: req.body.pass },
            (err: Error, user: any | undefined) => {
              if (user) {
                req.user = user;
                cookieSetFromUser(user, req, res, () => {
                  res.json({ signedin: true });
                });
              } else {
                res.json({ error: "wrong email and/or password" });
              }
            }
          );
        } else {
          res.json({ error: "not valid email and/or password" });
        }
      } else {
        res.json({ error: "email address can not be empty"})
      }
    } else {
      res.json({ error: "could not parse json" });
    }
  };
}

export function accountVerify(db: any) {
  return function (req: any, res: any) {
    if (req.body.email) {


      db.users.findOne({ uuid: req.user.uuid }, (errFind: Error, user: any) => {
        if (user) {
          if (user.email) { user.emailold = user.email } //save old
          user.email = req.body.email;
          user.emailverified = false;
          user.secretemailverificationcode = utils.generate(128);

          db.users.update({ uuid: user.uuid }, user, (errUpd: Error, resUpd: any) => {
            var gotourl = '/verify/' + user.uuid + '/' + user.secretemailverificationcode;

            /*
            sendmail(user.email, "plz verify. " + gotourl, (err: Error, mailed: any) => {
              res.json(mailed)
            })
            */

          })

        } else {
          console.log("USER NOT FOUND IN DB.");
          res.json({ result: "USER NOT FOUND" })
        }

      })


    }
  }
}


export function accountVerifyCheck(db: any) {
  return function (req: any, res: any) {
    console.log("accountVerifyCheck");
    db.users.findOne({ uuid: req.params.uuid, 'secretemailverificationcode': req.params.emailverificationcode }, (err: Error, user: any) => {
      if (err) console.log(err)

      if (user) {
        user.emailverified = true;
        db.users.update({ uuid: req.params.uuid }, user, (errUpd:Error, resultUpd:any) => {
          res.json(resultUpd);
        })
      } else {
        res.end("ERROR wrong user/secret")
      }

    });
  }
}

export interface account {
  email : string,
  apikey: string,
  password: string,
  level : number,
  created : any,
  uuid : string,
  lastSeen : any,
  ip : string,
  ipLoc : any,
  userAgent : any,
  emailverified : boolean
}


export function defaultAdminAccount(db:any) {
  // check if this is the first account.
  db.users.find({}).count( (errUsers:Error, usersCount:number) => {
    if (errUsers) console.log("ERR CANT ACCESS DB.USERS");
    
    if (usersCount == 0) {
      console.log("==== ADMIN ACCCOUNT ===")
      console.log(usersCount);
      accountCreate(db, "admin@localhost.com", "defaultAdmin", "", (err:Error,user:any)=>{
      }, {password:"admin", level:99})
    }
  })
  //
}



export function registerExistingAccount(db:any, user:any, cb:any) {
  console.log("registerExistingAccount")
  if (validateEmail(user.email)) {
    db.users.find({email:user.email}, (err:Error, usersEmailExists:any) => {

      if (usersEmailExists.length == 0) {
        db.users.update({ uuid: user.uuid }, user, { upsert: true },cb);  
      } else {
        cb("that email is taken", undefined)
      }
      

    })
    
  } else {
    cb("not valid email", undefined);
  }
  
}


// V3 API: ACCOUNT CREATE
export function accountCreate(db: any, email: any, userAgent: any, ip: any, cb: any, accRequest:any|undefined) {
  var event = new Date();
  var geoIPLoc = geoip.lookup(ip);
 

  var user:account = {
    uuid: utils.generate(128),
    created: {
      unix: event.getTime(),
      jsonTime: event.toJSON()
    },
    lastSeen: {
      unix: event.getTime(),
      jsonTime: event.toJSON()
    },
    ip: ip,
    ipLoc: geoIPLoc,
    userAgent: userAgent,
    emailverified: false,
    email: email.toLowerCase(),
    apikey: utils.generate(32),
    password: utils.generateDifficult(16),
    level: 0
  };

  
  if (accRequest) {
    // not ideal, used for automated testing
    if (accRequest.password) { user.password = accRequest.password }
    if (accRequest.level) { user.level = accRequest.level }
  }


  if (user.email.length > 0) {
    if (validateEmail(user.email)) {
      console.log("valid email")
      user.level++;
      db.users.find({email:user.email}, (err:Error, userExists:any) => {
        if (err) cb(err, undefined);
        
        if (userExists.length > 0) { 
          cb({error:"email exists"}, undefined );
          console.log("USER ALREADY EXISTS"); 
        } else {
          console.log("USER email does not exist in db yet.")
          db.users.save(user, cb);
        }

      })
    } else {
      console.log("not valid email")
    }
  } else {
    // auto created from cookies (no email data);
    db.users.save(user, cb);
  }
  

}


export function accountClear(db:any, account:account, cb:any) {
  if (account) {
    db.users.remove(account, cb);
  }
}

export function accountDelete(db:any, user:account, cb:any ) {
  console.log("USER!")
  console.log(user);
  db.users.remove(user, (err:Error, result:any) => {
    if (err) { cb(err, undefined); }
    if (result) { cb(undefined,result); }    
  })
}



export function validateEmail(email:string) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}


/**
 * Deep diff between two object, using lodash
 * @param  {Object} object Object compared
 * @param  {Object} base   Object to compare with
 * @return {Object}        Return a new object who represent the diff
 */

export function difference(object:any, base:any) {

	function changes(object:any, base:any) {
		return _.transform(object, function(result:any, value:any, key:any) {
			if (!_.isEqual(value, base[key])) {
				result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
			}
		});
    }
    
	return changes(object, base);
}



export function validApiKey(db:any,testkey:string,cb:any) {
  console.log("check validApi")
  db.users.findOne({apikey:testkey}, (err:Error, user:any)=>{
    if (user) {
      cb(undefined,{testkey:testkey, valid: true, user: user})
    } else {
      cb({testkey:testkey, valid: false}, undefined)
    }
  })
}

export function checkApiKey(testkey:string, cb:any) {
  validApiKey(dbglobal, testkey, cb)
}