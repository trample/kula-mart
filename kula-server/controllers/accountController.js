var role = require('../enums/role'),
    httpMethod = require('../enums/http'),
    validator = require('../lib/validator'),
    mongoose = require('mongoose'),
    ObjectID = require('mongodb').ObjectID,
    bcrypt = require('bcrypt-nodejs'),
    tokenGenerator = require('crypto');

// Load configurations (default: development)
var env = process.env.NODE_ENV || 'development',
    config = require('../conf/' + env + '.local.config');

var Account = mongoose.model('Account')

var FB = require('fb');

/*
 * Load balancer test alive   
 */
function alive(req, res) {
    res.send(200);
}

/*
 * Account login 
 */
function login(req, res) {

    if (req.body.email != null && req.body.password != null) {

        if (validator.checkEmailFormat(req.body.email)) {

            var query = { email: req.body.email };

            var projection = { email: 1, password: 1, username: 1, facebookId: 1, token: 1, status: 1, type: 1};

            Account.findOne(query, projection, function (err, account) {

                if (err) {
                    return res.send(404, 'Account not found');
                }

                if (account.status != Account.Status.ACTIVE) {
                    return res.send(403, 'Account is not active');
                }

                if (account.type > role.CUSTOMER) {
                    return res.send(403, 'Unauthorized account role');
                }

                if (!bcrypt.compareSync(req.body.password, account.password)) {
                    return res.send(403, 'Password does not match');
                }

                tokenGenerator.randomBytes(config.tokenLength, function (ex, buf) {

                    // account reset token
                    account.token = buf.toString('hex');

                    // update account
                    var condition = { _id: account._id };

                    var update = { token: account.token};

                    Account.update(condition, update, function (err) {

                        if (err) {
                            return res.send(404, 'Update Failed');
                        }

                        // return result
                        return res.send(200, account.securityMapping());

                    }); // end: updateAccount

                });// end: tokenGenerator

            }); // end: findAccount

        } else {
            return res.send(400, 'Invalid Email Format');
        }

    } else {
        // Bad Request
        return res.send(400, 'Bad Request');
    }
}


function signup(req, res) {
    Account.createAccount(req.body, function (err, acc) {
        if (err) {
            return res.send(500, err);
        }
        var toClientAccount = acc.securityMapping();
        return res.send(201, toClientAccount);
    });
}

function saveProfile(req, res) {
    console.log(req.account, req.body);
    Account.updateAccount(req.account, req.body, function (err, acc) {
        if (err) {
            return res.send(500, err);
        }
        var toClientAccount = acc.securityMapping();
        return res.send(200, toClientAccount);
    });
}


function validate(req, res) {
    res.send(200, req.account.securityMapping());
}

//function facebook(req, res) {
//    var virtualEmail = req.body.facebookId + '@facebookusers.kulamart.com';
//    Account.findOne({email: virtualEmail}, function (err, account) {
//        if (err || !account) {
//            var virtualReq = {
//                email: virtualEmail,
//                password: req.body.facebookId + Date.now(),
//                facebookId: req.body.facebookId,
//                name: req.body.name
//            };
//            Account.createAccount(virtualReq, function(err, acc){
//                if (err) {
//                    return res.send(500, err);
//                }
//                var toClientAccount = acc.securityMapping();
//                return res.send(201, toClientAccount);
//            });
//        } else {
//            return res.send(201, account.securityMapping());
//        }
//    })
//}

function checkFacebookId(req, res) {
    _checkFacebookId(req.body.facebookId, function(account) {
        _validateFacebookLogin(req.body.accessToken, req.body.facebookId, function(result){
            return res.send(200, account.securityMapping());
        }, function(err) {
            return res.send(403);
        });
    }, function(err) {
        return res.send(404, err);
    });
}

function _checkFacebookId(id, success, error) {
    Account.findOne({facebookId: id}, function(err, account) {
        if(err || !account) {
            error(err);
        } else {
            success(account);
        }
    });
}

function _validateFacebookLogin(accessToken, id, success, error) {
    FB.setAccessToken(accessToken);
    FB.api('/me', {}, function (result) {
        if(result.id && result.id == id) {
            success(result);
        } else {
            error(result);
        }
    });
}

function signUpWithFacebook(req, res) {
    _checkFacebookId(req.body.facebookId, function() {
        return res.send(400, 'User already exists.')
    }, function() {
        _validateFacebookLogin(req.body.accessToken, req.body.facebookId, function(result) {
            Account.createAccount(req.body, function (err, acc) {
                if (err) {
                    return res.send(500, err);
                }
                var toClientAccount = acc.securityMapping();
                return res.send(201, toClientAccount);
            });
        }, function(result) {
            return res.send(400, 'Invalid facebook access token.');
        });
    });
}

function addFavoritePost(req, res) {
    console.log(req.account, req.body.postId);
    Account.update({_id: ObjectID(req.account.id)}, {$addToSet: {favoritePosts: req.body.postId}}, function(err, data) {
        console.log(err, data);
        if(err) {
            return res.send(500);
        }
        return res.send(200);
    })
}

function getFavoritePost(req, res) {
    Account.findOne({_id: ObjectID(req.account.id)}, function(err, data) {
        if(err) {
            return res.send(500);
        }
        return res.send(200, {favoritePosts: data.favoritePosts});
    });
}

function getAccountList(req, res) {
    var query = {};
    if(req.params.type) {
        query = {type: req.params.type};
    }
    Account.find(query, {type:1, status:1 , email:1, name:1}, function(err, accounts) {
        if(err) {
            return res.send(500);
        }
        return res.send(200, accounts);
    });
}

function setAccountType(req, res) {
    Account.update({_id: req.params.accountId}, {type: req.body.type}, function(err, account){
        if(err) {
            return res.send(500);
        }
        return res.send(200, account);
    });
}

function deleteAccount(req, res) {
    Account.remove({_id: req.params.accountId}, function(err){
        if(err) {
            return res.send(500);
        }
        return res.send(200);
    });
}

exports.base = 'account';

exports.routes = [
    {
        'path': '',
        'method': httpMethod.GET,
        'handler': validate,
        'roles': [role.ADMIN, role.CUSTOMER],
        'version': '0.0.1'
    },
    {
        'path': '',
        'method': httpMethod.PUT,
        'handler': saveProfile,
        'roles': [role.ADMIN, role.CUSTOMER],
        'version': '0.0.1'
    },
    {
        'path': 'alive',
        'method': httpMethod.GET,
        'handler': alive,
        'version': '0.0.1'
    },
    {
        'path': 'login',
        'method': httpMethod.POST,
        'handler': login,
        'version': '0.0.1'
    },
    {
        'path': 'signup',
        'method': httpMethod.POST,
        'handler': signup,
        'version': '0.0.1'
    },
    {
        'path': 'facebook/signup',
        'method': httpMethod.POST,
        'handler': signUpWithFacebook
    },
    {
        'path': 'facebook/check',
        'method': httpMethod.POST,
        'handler': checkFacebookId
    },
    {
        'path': 'favorite',
        'method': httpMethod.POST,
        'roles': [role.ADMIN, role.CUSTOMER],
        'handler': addFavoritePost
    },
    {
        'path': 'favorite',
        'method': httpMethod.GET,
        'roles': [role.ADMIN, role.CUSTOMER],
        'handler': getFavoritePost
    },
    {
        'path': 'admin',
        'method': httpMethod.GET,
        'roles': [role.ADMIN],
        'handler': getAccountList
    },
    {
        'path': 'admin/:accountId',
        'method': httpMethod.PUT,
        'roles': [role.ADMIN],
        'handler': setAccountType
    },
    {
        'path': 'admin/:accountId',
        'method': httpMethod.DELETE,
        'roles': [role.ADMIN],
        'handler': deleteAccount
    }
];