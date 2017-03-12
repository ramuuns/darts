$(function(){
    "use strict";

    $("#stage-2").hide();

    var player_count = 1;
    var max_index = 0;
    var max_losses = parseInt($("#max_losses").val(),10);
    var remaining_players_cnt = 1;
    var max_skips = 0;
    var remaining_players = [];
    var games_per_pair = new Map();

    var players = {
        "player-0":{
            'name':"",
            'losses':0,
            'skips':0,
            'id':'player-0'
        }
    };

    $("#member-cont").on("keyup","input",function(){
        players[$(this).data("id")].name = $(this).val();
    });

    $("#member-cont").on("click","button.close",function(){
        var parent = $(this).closest(".control-group");
        delete players[paret.find("input").data("id")];
        player_count--;
        parent.remove();
        return false;
    });

    $("#add-member").on("click",function(){
        max_index++;
        player_count++;
        var id = "player-"+max_index;
        players[id] = {
            "name":"",
            "losses":0,
            "skips":0,
            'id':id
        };
        $("#member-cont").append($("#player-template").html().replace(/%data-id%/,id));
        return false;
    });

    $("#max_losses").on("blur",function(){
        max_losses = parseInt($(this).val(),10);
    });

    $("#start").on("click",function(){
        $.each(players,function(){
            remaining_players.push(this);
        });
        remaining_players_cnt = remaining_players.length;

        fillTable();
        for ( var i = 0; i < max_losses; i++ ) {
            createRoundHtml(createRound());
        }
        $("#stage-1").hide();
        $("#stage-2").show();
        return false;
    });

    var fillTable = function() {
        var table = $("#losses-table");
        $.each(players, function(){
            var row = $('<tr id="'+this.id+'">');
            row.append('<th>'+this.name+'</th>');
            for ( var i = 0; i < max_losses; i++ ) {
                row.append('<td class="loss-'+(i+1)+'"><span>X</span></td>');
            }
            row.append('<td class="place"></td>');
            table.append(row);
        });
    };

    var createRoundHtml = function(data) {
        var roundsCont = $("#rounds");
        var skips = null;
        var i;

        if ( data.skips.length === 0 ) {
            skips = "";
        } else {
            var skips = $($.trim($("#skip-template").html()));
            for ( i = 0; i < data.skips.length; i++ ) {
                skips.append('<div class="row">'+data.skips[i].name+'</div>');
            }
            skips = skips[0].outerHTML;
        }

        var games = "";

        for ( i = 0; i < data.pairs.length; i+=2 ) {
            var game = $("#game-template").html();
            for ( var j = 1; j < 5; j++ ) {
                game = game.replace("%player-"+j+"id%",data.pairs[j<3 ? i : i+1][(j-1)%2].id);
                game = game.replace("%player-"+j+"name%",data.pairs[j<3 ? i : i+1][(j-1)%2].name);
            }
            games += game;
        }

        var round = $("#round-template").html().replace(/%games%/,games).replace(/%skips%/,skips);

        $($.trim(round)).appendTo(roundsCont);
    };

    var createRound = function(){
        var roundSkips = new Map();
        var roundPairs = Array.from(remaining_players);
        var i;

        if ( remaining_players_cnt % 4 ) {
            //ir haļavas
            //jāizlozē haļavas
            var sorted_by_skips = remaining_players.sort(function(a,b){ 
                if ( a.skips === b.skips ) { 
                    return Math.random() - Math.random();
                } 
                return a.skips - b.skips;   
            });

            for ( i = 0; i< remaining_players_cnt%4; i++ ) {
                roundSkips.set(sorted_by_skips[i], 1);
                sorted_by_skips[i].skips++;
            }
        }

        //atliksušie pēc haļavām
        roundPairs = roundPairs.filter((player) => {
            return !roundSkips.has(player);
        });
        
        //visi iespējamie pāri no šiem atlikušajiem spēlētājiem
        var allPairs = createPairs(roundPairs);

        //atrodam mazāko spēļu skaitu, ko kāds pāris ir spēlējis kopā
        var min_games = allPairs.reduce((p,c) => {
            var k = c[0].id + c[1].id;
            return Math.min(p, games_per_pair.has(k) ? games_per_pair.get(k) : 0);
        }, +Infinity);

        //izmetam ārā visus pārus, kuri ir spēlējuši min_spēles + 1 spēli
        allPairs = allPairs.filter((pair) => {
            var key = pair[0].id + pair[1].id;
            if ( games_per_pair.has(key) && games_per_pair.get(key) > min_games ) {
                return false;
            }
            return true;
        });

        //ja visi ir izmesti, nu tad po, ņemam visus
        if ( allPairs.length === 0 ) {
            allPairs = createPairs(roundPairs);
        }

        var pairs = [];

        // tagad metīsim ārā no roundPairs spēlētājus, kuri ir izlozēti
        while ( roundPairs.length ) {
            //ņemam randomā pāri
            var pair = allPairs[Math.floor(Math.random() * allPairs.length)  ];
            //randomā izdomājam secību šajā pārī
            pairs.push( pair.sort((a,b) => { Math.random() - Math.random() }) );
            //izmetam šo pāri ārā no saraksta
            roundPairs = roundPairs.filter((player) => {
                return player.id != pair[0].id && player.id != pair[1].id;
            });
            //atzīmējam cik reizes šis pāris ir spēlējis kopā
            var key = pair[0].id + pair[1].id;
            if ( games_per_pair.has(key) ) {
                games_per_pair.set(key, games_per_pair.get(key) + 1);
            } else {
                games_per_pair.set(key, 1);
            }
            //izmetam abus dalībniekus no pāru saraksta
            allPairs = allPairs.filter((apPair) => {
                return apPair[0].id != pair[0].id && apPair[0].id != pair[1].id && apPair[1].id != pair[0].id && apPair[1].id != pair[1].id;
            });
            //ja mums vairs nav pāru, bet ir vēl dalībnieki, nu tad neko darīt, taisam jaunus pārus no atlikušajiem
            if ( roundPairs.length && allPairs.length === 0 ) {
                allPairs = createPairs(roundPairs);
            }
        }

        return {
            'skips': Array.from(roundSkips.keys()),
            'pairs': pairs
        };
    };

    function createPairs(players) {
        var sorted = players.sort((a,b) => { a.id < b.id ? -1 : 1; });
        var ret = [];
        for ( var i = 0; i < sorted.length; i++ ) {
            for ( var j = i + 1; j < sorted.length; j++) {
                ret.push([players[i], players[j]]);
            }
        }
        return ret;
    }

    $(document).on("click",".pair",function(){
        $(this).addClass("alert").addClass("alert-success");
        
        $(this).closest(".span4").find( ($(this).hasClass("first") ? ".second" : ".first") + ' span').each(function(){
            var player = $(this).data("player");
            players[player].losses++;
            $("#"+player+ " td.loss-"+players[player].losses).addClass("loss");
            if ( players[player].losses === max_losses ) {
                for ( var i = 0; i<remaining_players_cnt; i++ ) {
                    if ( remaining_players[i] === players[player] ) {
                        remaining_players.splice(i,1);
                        remaining_players_cnt--;
                    }
                }
            }
        });
        
        $(this).closest(".span4").find(".pair").removeClass("pair");
    });

    $("#create-round").on("click",function(){
        createRoundHtml(createRound());
    });

});