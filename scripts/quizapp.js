/**
 * Quiz Application Launcher...
 */
var QuizApplication = {
	/**
	 * Creates a JSONP Request in order to work with the application
	 * in local system as well 
	 */
	createJSONPRequest : function() {
		var url = "./model/questions.json";
		// ?callback=... not required...
		var script = document.createElement('script');
		script.setAttribute('src', url);
		document.getElementsByTagName('head')[0].appendChild(script);
	},
	_data : null,
	isDataReady : function() {
		return this._data != null;
	},
	/**
	 * Callback method as soon as the JSONP finished execution
	 * @returns void
	 */ 
	launchApp : function(data) {
		this._data = data;
		var frontController = new FrontController();
		var questionCollection = new QuestionCollection();
		$.each(this._data.questions, function(index, object) {
			var quizQuestion = new QuizQuestion({
				question : object.question,
				answers : object.answers,
				weight : object.weight,
				type : object.type,
				imageURL : object.imageURL
			})
			questionCollection.add(quizQuestion);
		})
		var view = new QuizView({
			router : frontController,
			collection : questionCollection
		})
	},
	/**
	 *  
	 */
	getQuestions : function() {
		return this._data.questions;
	},
	getTitle : function() {
		return this._data.title;
	},
	getTime : function() {
		return this._data.time;
	},
	isRandomized : function() {
		return this._data.randomized;
	}
};

var QuizQuestion = Backbone.Model.extend({
	defaults : {
		question : null,
		answers : null,
		weight : 0,
		type : null,
		imageURL : null
	}
});

var QuestionCollection = Backbone.Collection.extend({
	model : QuizQuestion
});

var QuizModel = Backbone.Model.extend({
	defaults : {
		question : null,
		questionIndex : 0,
		userAnswers : 0,
		collection : null,
	},
	getAttemptedAnswers : function() {
		var attemptedAnswers = 0;
		var userAnswers = this.get("userAnswers");
		for (var answerIdx = 0, answerLen = userAnswers.length; answerIdx < answerLen; answerIdx++) {
			if ( typeof userAnswers[answerIdx] !== 'undefined') {
				attemptedAnswers++;
			}
		}
		return attemptedAnswers;
	},
	getQuestionsCount : function() {
		return this.get("collection").length;
	},
	getTotalScore : function() {
		// some dummy logic...
		return this.getAttemptedAnswers() * 2;
	},
	fetchQuestion : function(idx) {
		// Virtual DB.... as there is no server connection... to poll...
		return this.get("collection").at(idx);
	},
	pollDB : function() {
		this.set({
			question : this.fetchQuestion(this.get('questionIndex'))
		});
	},
	initialize : function() {
		this.pollDB();
	},
	validate : function() {

	}
});

var QuizView = Backbone.View.extend({
	START_TIME : 60,
	TIME_UP : 10,
	END_TIME : 0,
	TIMED_OUT_INTERVAL : 100,
	currentQuestionIndex : 0,
	el : 'body',
	timer : null,
	seconds : 60,
	answers : [],
	recordCount : 0,
	initialize : function(options) {
		Backbone.history.start();
		// This option is must ....before invoking route / navigate...
		this.options.router.navigate("page/index_view", {
			trigger : true,
			replace : true
		});
	},
	render : function() {
		this.updateView();
		return this;
	},
	resetTimer : function() {
		if (this.timer) {
			clearInterval(this.timer);
		}
		this.seconds = this.START_TIME;
		this.timer = setInterval( function(self) {
			return function() {
				if (self.seconds == self.END_TIME) {
					clearInterval(self.timer);
					if (self.currentQuestionIndex < (self.recordCount - 1)) {
						self.seconds = self.START_TIME;
						self.nextQuestion();
					} else {
						self.getScoreReport();
					}
				}
				if (self.seconds == self.TIME_UP) {
					$("#timer_image").attr('src', './images/timer_times-up_A.png');
				}
				var seconds = "" + self.seconds;
				$(".time-left").html("00:" + (seconds.length == 1 ? 0 + seconds : seconds));
				self.seconds--;
			};
		}(this), this.TIMED_OUT_INTERVAL);
	},
	setActiveElement : function(srcElement) {
		var cssText = srcElement.style.cssText;
		$(".options").each(function() {
			$(this).css("background", "rgba(255,255,255,0.15)");
			if (String($(this).children().eq(0).prop("tagName")).toLowerCase() == 'span') {
				$(this).children().eq(0).remove();
			}
		});
		$(srcElement).css("background", "rgba(255,255,255,0.5)");
		$(srcElement).prepend("<span style='float:left;color:#00deff;font:bold 15px arial'>&#10003;</span>");
	},
	mapAnswers : function(event) {
		var srcElement = event.srcElement || event.target;
		var idx = 0;
		if (event.type == 'change') {
			idx = srcElement.getAttribute("id").split("_")[1];
			this.answers[idx] = srcElement.value;
		} else {
			while (srcElement && srcElement.tagName.toLowerCase() != 'a') {
				srcElement = srcElement.parentNode;
			}
			idx = srcElement.getAttribute("id").split("_")[1];
			this.answers[idx] = srcElement.innerHTML;
		}
		this.model.set({
			userAnswers : this.answers
		});
		this.setActiveElement(srcElement);
	},
	updateView : function() {
		this.resetTimer();
		var current = this.currentQuestionIndex;
		var questionData = this.model.get('question');
		if (questionData) {
			$(".question_idx").html("Question Listing " + (this.currentQuestionIndex + 1) + " of 10");
			$(".question").html(questionData.get("question"));
			$(".weightage").html("Weight : " + questionData.get("weight"));
			var fragment = document.createDocumentFragment();
			var self = this;
			if (questionData.get("answers") && questionData.get("type") == "radio") {
				$(".option_list").html("");
				for (var answerIdx = 0, answerLen = questionData.get("answers").length; answerIdx < answerLen; answerIdx++) {
					// We can use document fragments as well
					$("<li><a></a></li>")// li
					.find("a")// a
					.addClass("options").click(function() {
						self.mapAnswers.apply(self, arguments);
					}).attr("href", "#")// a
					.attr("id", "question_" + this.currentQuestionIndex).html(questionData.get("answers")[answerIdx])// a
					.end()// li
					.appendTo($(".option_list"));
				}
			} else {
				$(".option_list").html("");
				$("<img/>").attr("src", questionData.get("imageURL")).attr("width", "150").attr("height", "150").attr("alt", "Image not found").appendTo($(".option_list"));
				// Line break
				$("<br/><br/>").appendTo($(".option_list"));
				$("<input/>").attr("type", "text").change(function() {
					self.mapAnswers.apply(self, arguments);
				}).attr("id", "fillin_" + this.currentQuestionIndex).appendTo($(".option_list"));
			}
		}
	},
	events : {
		'click .next_question' : 'nextQuestion',
		'click .finish_quiz' : 'getScoreReport',
		'click .pass' : 'saveAndNext',
		'click .start' : 'startQuiz',
		'click .help' : 'showHelp',
		'click .restart' : 'startQuiz',
		'click .newgame' : 'startQuiz'
	},
	saveAndNext : function() {
		if (this.currentQuestionIndex < (this.recordCount - 1)) {
			this.nextQuestion();
		} else {
			this.getScoreReport();
		}
	},
	nextQuestion : function() {
		this.currentQuestionIndex++;
		$("#timer_image").attr('src', './images/timer_start.png');
		this.model.set({
			questionIndex : this.currentQuestionIndex
		});
		if (this.currentQuestionIndex == (this.recordCount - 1)) {
			$(".next_question").css("display", "none");
			$(".finish_quiz").css("display", "block");
		} else {
			$(".next_question").css("display", "block");
			$(".finish_quiz").css("display", "none");
		}
		this.model.pollDB();
	},
	startQuiz : function() {
		this.currentQuestionIndex = 0;
		$(".next_question").css("display", "block");
		$(".finish_quiz").css("display", "none");
		this.options.router.navigate("page/quiz_view", {
			trigger : true,
			replace : true
		});
		this.model = new QuizModel({
			collection : this.options.collection
		});
		this.model.bind("change:question", this.updateView, this);
		this.updateView();
		this.recordCount = this.model.getQuestionsCount();
	},
	showHelp : function() {
		alert("Help not available ..");
	},
	getScoreReport : function() {
		if (this.timer) {
			clearInterval(this.timer);
		}
		var attemptedAnswers = this.model.getAttemptedAnswers();
		var totalScore = this.model.getTotalScore();
		this.options.router.navigate("page/results_view", {
			trigger : true,
			replace : true
		});
		var wishText = totalScore >= 10 ? "Congratulations" : "Sorry !!"
		$(".question_score").html(attemptedAnswers + "/" + this.recordCount);
		$(".total_score").html("Your Score is <br/>" + totalScore);
		$(".wish_text").html(wishText);
	}
});

var FrontController = Backbone.Router.extend({
	routes : {
		"home" : "home",
		"page/:view" : "showView"
	},
	home : function() {
		// time being hardcoded the view name...however it is not a best practice...
		this.navigate("page/index_view", true);
	},
	showView : function(viewName) {
		$(".template_view").each(function() {
			$(this).css("display", "none");
		});
		$("#" + viewName).css('display', 'block');
	}
});
