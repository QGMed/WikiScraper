var wtf_wikipedia = require("wtf_wikipedia");
var needle = require('needle');
var fs = require('fs');

//WikiScrapper is an autonomous bot that goes through wikipedia and attempts to scrape
//all medically related topic.

var WS = new(function(){
	var ctx = this;
	this.ignorePages = [];				//Pages that should be ignored (Already Scraped)
	this.prospectivePages = [];			//Pages that we should visit.

	//Starts the scraping process at a given topic
	this.run = function(subject){
		
		//Append page to ignore so it is never revisited
		ctx.ignorePages.push(subject);

		//Get the page's details
		var pageData = ctx.getLinksAndText(subject).then(
			function(pageData){

				//check if the page is medically related
				ctx.isMedical(pageData.text).then(
					function(isMedical){

						//if it is save it.
						if(isMedical){
							console.log(subject+" was deemed medically valid");
							save("data/"+subject+".txt",pageData.text);
							ctx.addNewLinks(pageData.links);
						}else{
							console.log(subject+" was rejected");
						}

						ctx.backup(5);
						ctx.run(ctx.prospectivePages.shift());

					}
				)
			}
		);
	}


	//Fetches article from wikipedia and return the article text along with all of
	//the links on the page
	this.getLinksAndText = function(subject){
		return new Promise( function(res,rej){


						wtf_wikipedia.from_api(subject, "en", function(markup){
						    var obj= wtf_wikipedia.parse(markup)
						    var text = obj.text;
						    var rawText = "";
						    var retLinks = [];
						    for(var key in text){
								var sentences = text[key];
							  	for(var i=0; i<sentences.length;i++){
							  		var links = sentences[i].links;
							  		rawText += sentences[i].text+" ";
							  		if(links !==undefined){
							  			for(var j=0; j<links.length; j++){
							  				retLinks.push(links[j].page);
							  			}
							  		}
							  	}
					  		}
					  		res({"text":rawText, "links": retLinks});
					  	})
				
					});
	}



	//Minimizes the text to just rough introduction
	this.getFirstSentences = function(text){
		var numSentence = 7;
		var endI = text.nthIndexOf(". ",numSentence);
		return removeWikiNotation(text.substring(0,endI+1));
	}




	//Pings the mm helper server to determine if the article is relevant
	this.isMedical = function(text){
		return new Promise(function(res,rej){

			text = ctx.getFirstSentences(text);
			if(text.length<15){
				res(false);
			}else{
				needle.get('http://localhost:4567/isMedical?text='+text, function(err, resp) {
				  	res(resp.body === "true");
				});
			}

		});
	}

	//adds new links making sure not to add any that are to be ignored
	this.addNewLinks = function(links){
		for(var i=0; i<links.length; i++){
			if(ctx.ignorePages.indexOf(links[i])==-1){
				ctx.prospectivePages.push(links[i]);
			}
		}
	}

	//backs up our visit data every nth visit
	this.pageViews = 0;
	this.backup = function(n){
		ctx.pageViews++;
		if(ctx.pageViews%n==0){
			ctx.saveVisitedPages();
		}
	}

	//Saves current recorded progress.
	this.saveVisitedPages = function(){
		save("ignorePages.txt",ctx.ignorePages.toString());
		save("prospectivePages.txt",ctx.prospectivePages.toString());
	}



	//Removes Wikipedia Notation
	function removeWikiNotation(input){
		var wikNot = /(\[)([\w \s])*(\])/g;
		return input.replace(wikNot,"");//.replace(/[^A-Za-z0-9\s\.,;\(\)]/g, '').replace(/\s\s/g," ");
	}

	//Generic file saver
	function save(file,data){

		fs.writeFile(file, data, function(err) {
		    if(err) {
		        return console.log(err);
		    }
		    console.log(file+" saved.");
		});

	}


})();

WS.run("Medicine");





String.prototype.nthIndexOf = function(pattern, n) {
    var i = -1;

    while (n-- && i++ < this.length) {
        i = this.indexOf(pattern, i);
        if (i < 0) break;
    }

    return i;
}