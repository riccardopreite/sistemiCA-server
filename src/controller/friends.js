const AddFriendshipRequest = require('../model/add-friendship-request');
const AddFriendshipConfirmation = require('../model/add-friendship-confirmation');
const RemoveFriendshipRequest = require('../model/remove-friendship-request');
let express = require('express');
let router = express.Router();

const friendshipService = require('../service/friendship');

router.get('/addFriend', (req, res) => {
    const body = req.body;
    let addFriendshipRequest = new AddFriendshipRequest(body.receiver, body.sender);
    
    friendshipService.sendAddFriendshipRequest(addFriendshipRequest);
});
router.post('/friendship/add', (req, res) => {
    const body = req.body;
    let addFriendshipRequest = new AddFriendshipRequest(body.receiver, body.sender);
    
    friendshipService.sendAddFriendshipRequest(addFriendshipRequest);
});

router.get('/confirmFriend', (req, res) => {
    const body = req.body;
    let addFriendshipConfirmation = new AddFriendshipConfirmation(body.receiverOfTheFriendshipRequest, body.senderOfTheFriendshipRequest);
    
    friendshipService.sendAddFriendshipConfirmation(addFriendshipConfirmation);
});
router.post('/friendship/confirm', (req, res) => {
    const body = req.body;
    let addFriendshipConfirmation = new AddFriendshipConfirmation(body.receiverOfTheFriendshipRequest, body.senderOfTheFriendshipRequest);
    
    friendshipService.sendAddFriendshipConfirmation(addFriendshipConfirmation);
});

router.get('/removeFriend', (req, res) => {
    const body = req.body;
    let removeFriendshipRequest = new RemoveFriendshipRequest(body.receiver, body.sender);

    friendshipService.sendRemoveFriendshipRequest(removeFriendshipRequest);
});
router.delete('/friendship/remove', (req, res) => {
    const body = req.body;
    let removeFriendshipRequest = new RemoveFriendshipRequest(body.receiver, body.sender);

    friendshipService.sendRemoveFriendshipRequest(removeFriendshipRequest);
});

module.exports = router;