/**
 * jQuery Disqus Plugin
 *
 * Copyright (c) 2010 Lance Pollard (@viatropos)
 * Licensed under the MIT (MIT-LICENSE.txt)
 * Based off Rob Loach's jquery disqus plugin (http://robloach.net)
 * version 1.function 0(args) {
  
 }
 
 */
(function($) {
  
  function unescapeHTML(html) {
    return $("<div />").html(html).text();
  }
  function escapeHTML(html) {
    return $("<div />").text(html).html();
  }
  function removeBreaks(text) {
    var match = text.substring(0, 4).toLowerCase().match(/<br\/?>/);
    if (match) {
      text = text.substring(match[0].length, text.length - 1);
      return removeBreaks(text);
    } else {
      return text;
    }
  }
  
  $.fn.disqus = function(options) {
    if ($(this).get(0) == null) {
      return;
    }
    // Merge in the default options.
    var options = $.extend({
      domain: '',
      title: '',
      message: '',
      url: window.location.href,
      developer: 0,
      no_style: false,
      iframe_css: null,
      ready: null,
      added: null,
      markdown: false,
      prettify: false,
      show_count: false,
      interval: 100 // how often we should check to see if disqus is ready
    }, options);
    
    // Set the options for Disqus and prepare the element.
    window.disqus_no_style = options.no_style; // document.write causes a whitescreen so prevent it.
    
    window.disqus_iframe_css = disqus_iframe_css = options.iframe_css;
    disqus_developer = options.developer;
    disqus_container_id = this.attr('id');
    disqus_url = options.url;
    disqus_title = options.title;
    disqus_message = options.message;
    this.empty();
    
    var comments = $(this);
    
    if (options.markdown == true) {
      if (!("AttackLab" in window)) {
        // $.getScript();
      }
    }
    if (options.prettify == true) {
      if (!("prettyPrint" in window)) {
        // $.getScript();
      }
    }

    // Make the AJAX call to Disqus for the comments.
    $.ajax({
      type: 'GET',
      url: 'http://' + options.domain + '.disqus.com/embed.js',
      dataType: 'script',
      cache: true
    });
    
    if (options.show_count == true) {
      var link = $("<a id='dsq-comment-count-for-this' class='dsq-comment-count' style='display:none;' href='" + window.location.href + "'>");
      link.appendTo($("body")).disqusLink(options.domain);
    }
    
    $.disqus.ready(function() {
      if (options.ready) {
        options.ready.apply(comments);
      }
      setInterval(function() {
        $.disqus.added(function(comments) {
          if (options.markdown == true) {
            $.disqus.toMarkdown(comments);
          }
          if (options.added) {
            options.added.apply(comments, [comments]);
          }
        });
        $.disqus.edit(function (textarea) {
          if (options.edit) {
            options.edit.apply(textarea, [textarea]);
          }
        });
        if (options.prettify == true) {
          $.disqus.prettify();
        }
      });
    }, options.interval);
  };
  $.disqus = {
    links: function(links, domain) {
      var links = $(links);
      
      // Create the query.
      window.disqus_shortname = domain;
      
      if (links.get(0) == null)
        return;
      
      links.each(function(index, element) {
        var element   = $(element);
        var href      = element.attr("href").toLowerCase();
        var absolute  = href.match(/^http(?:s)?:\/\//);
        if (!absolute) {
          href = window.location.protocol + "//" + window.location.host + href;
        }
        var hasHash = href.match(/#disqus_thread/);
        if (!hasHash) {
          href += "#disqus_thread";
        }
        element.attr("href", href).addClass("dsq-comment-count");
      });
      // Make the AJAX call to get the number of comments.
      $.ajax({
        type: 'GET',
        url: 'http://disqus.com/forums/' + domain + '/count.js',
        dataType: 'script',
        cache: true
      });
    },
    
    reactionCount: function() {
      var string = $("a#dsq-comment-count-for-this").html();
      var count = 0;
      if (string)
         count = parseInt(string.match(/\d+\s+Comments\s+and\s+(\d+)\s+Reactions/i)[1]);
      return count;
    },
    
    commentCount: function() {
      var string = $("a#dsq-comment-count-for-this").html();
      var count = 0;
      if (string)
         count = parseInt(string.match(/(\d+)\s+Comments\s+and\s+\d+\s+Reactions/i)[1]);
      return count;
    },
    
    ready: function(callback) {
      var interval = 100;
      var check_disqus = setInterval(function() {
        var disqusLoaded = $("#dsq-comments-title").get(0) != null;
        if (disqusLoaded) {
          clearInterval(check_disqus);
          callback();
        }
      }, interval)
    },
    
    added: function(callback) {
      var comments = $(".dsq-comment-message:not(.processed)");
      if (comments.get(0)) {
        callback(comments);
      }
    },
    
    edit: function(callback) {
      var textarea = $(".dsq-edit-textarea:not(.processed)");
      if (textarea.get(0)) {
        textarea.val(textarea.val().replace(/<br>/g, "\n"));
        textarea.addClass("processed");
        callback(textarea);
      }
    },
    
    toMarkdown: function(comments) {
      comments.each(function(index, element) {
        element = $(element);
        var text = element.html();
        var converter = new Attacklab.showdown.converter();
        var spaces;
        try {
          spaces = text.match(/([\s\n]+)/)[1];
          text = text.substring(Math.max(0, spaces.length - 1), text.length - 1);
        } catch (error) {}

        text = text.replace(/<br>(<br>+)?(\s+)?/g, "\n$1$2").replace(/\n<br>/g, "\n\n")
        // text = text.replace(/\<br\>/g, "\n");

        text = converter.makeHtml(text);
        text = $("<div>" + text + "</div>");
        var right = false;
        $("code", text).replaceWith(function() {
          var html = $(this).html();
          if (html) {
            return "<code>" + escapeHTML(html).replace(/&amp;/g, "&").replace(/&amp;/g, "&") + "</code>";
          } else {
            return "";
          }
        });

        element.html(text.children());
        element.addClass("processed");
      });
    },
    
    prettify: function() {
      if ($("pre:not(.prettyprint)").get(0)) {
        var codes = $("pre");
        codes.each(function() {
          var code = $(this);
          if (code.hasClass("prettyprint")) {
            code.removeClass("prettyprint");
          } else {
            code.addClass("prettyprint");
            var text = removeBreaks($("code", this).html());
            try {
              //$("br", code).replaceWith("\n");
            } catch (e) {}
            code.html("<code>" + text + "</code>");
            changed = true;
          }
        });
        prettyPrint();
        codes.addClass("prettyprint");
      }
    }
  }
  $.fn.disqusLink = function(domain) {
    return $.disqus.links(this, domain);
  };
})(jQuery);