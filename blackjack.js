$(function(){
	//Player stuff
	var Player = Backbone.Model.extend({
		defaults: {
			type: 'COMPUTER',
			bank: 100,
			score : 0,
			handResult : '',
			history: null
		},
		clear: function(){
			this.set('score', 0);
			this.set('handResult', '');
			this.get('cards').reset();
		}
	});
	
	var Players = Backbone.Collection.extend({
		model: Player,
		initialize: function(){
			this.bind('add', this.log, this);
		},
		log: function(player) {
//			console.log(player);
		}
	});
	
	var Hand = Backbone.Collection.extend({
		model: Card,
		initialize: function(){
			this.bind('add', this.log, this);
		},
		log: function(card) {
//			console.log(card);
		}
	});
	
	var CardView = Backbone.View.extend({
		tagName: 'span',
		className: 'card',
		template: _.template($('#card-template').html()),
		initialize: function(){
			this.render();
			this.model.bind('add', this.render, this);
		},
		render: function(){
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		}
	});
	
	var HandView = Backbone.View.extend({
		tagName: 'div',
		className: 'hand',
		initialize: function(){
			this.render();
			this.collection.bind('add', this.render, this);
			this.collection.bind('remove', this.render, this);
		},
		render: function(){
			view = this;
			view.$el.html('');
			view.collection.each(function(card) {
				var cardView = new CardView({model: card});
				view.$el.append(cardView.$el);	
			});
		}
	});
			
	var PlayerView = Backbone.View.extend({
		tagName: 'div',
		className: 'player',
		template: _.template($('#player-template').html()),
		initialize: function(){
			this.render();
			this.model.bind('change', this.render, this);
		},
		render: function(){
			this.$el.html(this.template(this.model.toJSON()));
			this.$el.append(new HandView({collection: this.model.get('cards')}).$el);
			return this;
		}
	});
	
	//Card Stuff
	var Card = Backbone.Model.extend({
		defaults: {
			suit: '',
			card: '',
			cValue: 0
		},
		initialize: function(){
//			console.log('set suit:' + this.get('suit'));
			var newValue = this.get('cValue');
			
			switch ( newValue ){
			
				case 11:
					this.set('card', 'J');
					this.set('cValue', 10);
//					console.log('j');
					break;
				case 12:
					this.set('card', 'Q');
					this.set('cValue', 10);
//					console.log('q');
					break;
				case 13:
					this.set('card', 'K');
					this.set('cValue', 10);
//					console.log('k');
					break;
				case 14:
					this.set('card', 'A');
					this.set('cValue', 11);
//					console.log('a');
					break;
				default:
					this.set('card', newValue);
//					console.log(newValue);
					break;
			
			}
		}
	});
	
	var Deck = Backbone.Collection.extend({
		model: Card,
		initialize:function(){
			this.buildNew();
			this.shuffle();
		},
		shuffle: function(){
			for (var i=0; i<100; i++) {
				var cardA = Math.floor( this.length*Math.random() ),
					cardB = Math.floor( this.length*Math.random() ),
					tempcard = this.models[cardB]
				this.models[cardB] = this.models[cardA];
				this.models[cardA] = tempcard;
			}
		},
		getCards: function(amt){
			var newCards = [];
			for(var n = 0; n<amt; n++){
				if(this.length < 1){
					this.buildNew();
					this.shuffle();
				}
				newCards.push(this.shift());
			}
			return newCards;
		},
		buildNew: function(){
			this.reset();
			for ( var i=2; i<15 ; i++ ){
				this.add({suit:'C',cValue:i});
				this.add({suit:'H',cValue:i});
				this.add({suit:'S',cValue:i});
				this.add({suit:'D',cValue:i});
			}
		}
	});
	
	//Play stuff
	var Play = Backbone.Model.extend({
		defaults:{
			activePlayer: 0
		},
		initialize: function(){
			this.players = new Players;
			this.deck = new Deck;

			this.players.add({type: 'DEALER',bank: 1000, cards : new Hand, history: new Array()});
			this.players.add({type: 'COMPUTER',bank: 100, cards : new Hand, history: new Array()});
			this.players.add({type: 'COMPUTER',bank: 100, cards : new Hand, history: new Array()});
			this.players.add({type: 'YOU',bank: 100, cards : new Hand, history: new Array()});
			this.deal();
			this.startGame();
		},
		deal: function(){
			var curHand = this;
			this.players.forEach(function(curPlayer){
				curPlayer.get('cards').add(curHand.deck.getCards(2));
				curHand.getScore(curPlayer);
			});
		},
		hitMe: function(){
			var activePlayer = this.players.at(this.get('activePlayer'));
			activePlayer.get('cards').add(this.deck.getCards(1));
			this.getScore(activePlayer);
			if(activePlayer.get('score') > 21){
				activePlayer.set('handResult', 'BUST');
				this.next();
			}
		},
		stand: function(){
			this.next();
		},	
		newHand: function(){
			if(this.deck.length < this.players.length*2){
				this.deck
			}
			this.deal();
			this.startGame();
		},
		startGame: function(){
			var curPlayer = this.players.at(this.get('activePlayer'));
			if (curPlayer.get('type') === 'DEALER' || curPlayer.get('type') === 'COMPUTER'){
				while(curPlayer.get('score') < 17) {
					this.hitMe();
				}
				if(curPlayer.get('score') < 22){
					this.stand();
				}
			}
		},
		getScore: function(curPlayer){
			var newScore = 0;
			
			curPlayer.get('cards').forEach(function(curCard){
				newScore += curCard.get('cValue');
				if(newScore > 21 && curCard.get('cValue') === 11){
					curCard.set('cValue', 1);
					return newScore-=10;
				}
			});
			curPlayer.set('score', newScore);
		},
		calcResult: function(){
			var dealer = this.players.where({type: 'DEALER'})[0],
			scoreToBeat = dealer.get('score'),
			dealerBank = dealer.get('bank'),
			dealStat = dealer.get('handResult');
			
console.log('dealer status:' + dealer.get('handResult'));
			
			this.players.forEach(function(actPlayer){
				var playerBank = actPlayer.get('bank');
				if(actPlayer.get('type') !== 'DEALER'){
					if(actPlayer.get('score') > scoreToBeat && actPlayer.get('handResult') !== 'BUST' || dealStat === 'BUST' && actPlayer.get('handResult') !== 'BUST'){
						actPlayer.set('handResult', 'WIN');
						playerBank++;
						dealerBank--;
						actPlayer.set('bank', playerBank);
						dealer.set('bank', dealerBank);
					}else if(dealStat !== 'BUST' && actPlayer.get('score') < scoreToBeat || actPlayer.get('handResult') === 'BUST' && dealStat !== 'BUST'){
						actPlayer.set('handResult', 'LOSE');
						playerBank--;
						dealerBank++;
						actPlayer.set('bank', playerBank);
						dealer.set('bank', dealerBank);
					}else{
						actPlayer.set('handResult', 'PUSH');
					}
				}
				
				var oldScore = actPlayer.get('score'),
				oldResult = actPlayer.get('handResult'),
				newHistory = [oldScore, oldResult],
				oldHistory  = actPlayer.get('history');
				oldHistory.push(newHistory);
				actPlayer.clear();
			});
			dealer.clear();
			this.newHand();
		},
		next: function(){
			var activePlayer = this.get('activePlayer');
			activePlayer += 1;
			if(activePlayer > this.players.length - 1) {
				this.set('activePlayer', 0);
				this.calcResult();
			}else{
				this.set('activePlayer', activePlayer);
				this.startGame();
			}
		}
	});
	
	var PlayView = Backbone.View.extend({
		el: $('#blackjack'),
		tagName: 'div',
		events: {
			'click button.hit': 'hit',
			'click button.stand': 'stand'
		},
		hit: function(){
			this.model.hitMe();
		},
		stand: function(){
			this.model.stand();
		},
		initialize: function(){
			var game = this;
			game.model.bind('change:currentPlayer', this.controls, game.model);
			game.model.players.each(function (player){
				var playerView = new PlayerView({model: player});
				game.$el.append(playerView.$el);
			});
		}
	});
	
	var playView = new PlayView({model:new Play});
});