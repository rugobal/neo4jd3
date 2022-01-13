(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Neo4jd3 = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
'use strict';

var neo4jd3 = _dereq_('./scripts/neo4jd3');

module.exports = neo4jd3;

},{"./scripts/neo4jd3":2}],2:[function(_dereq_,module,exports){
/* global d3, document */
/* jshint latedef:nofunc */
'use strict';

function Neo4jD3(_selector, _options) {
    var container,
        graph,
        info,
        node,
        nodes,
        relationship,
        relationshipOutline,
        relationshipOverlay,
        relationshipText,
        relationships,
        selector,
        simulation,
        svg,
        svgNodes,
        svgRelationships,
        svgScale,
        svgTranslate,
        classes2colors = {},
        justLoaded = false,
        numClasses = 0,
        options = {
        arrowSize: 4,
        colors: colors(),
        highlight: undefined,
        iconMap: fontAwesomeIcons(),
        icons: undefined,
        imageMap: {},
        images: undefined,
        infoPanel: true,
        minCollision: undefined,
        neo4jData: undefined,
        neo4jDataUrl: undefined,
        nodeOutlineFillColor: undefined,
        nodeRadius: 25,
        relationshipColor: '#a5abb6',
        zoomFit: false
    },
        VERSION = '0.0.1';

    function appendGraph(container) {
        svg = container.append('svg').attr('width', '100%').attr('height', '100%').attr('class', 'neo4jd3-graph').call(d3.zoom().on('zoom', function () {
            var scale = d3.event.transform.k,
                translate = [d3.event.transform.x, d3.event.transform.y];

            if (svgTranslate) {
                translate[0] += svgTranslate[0];
                translate[1] += svgTranslate[1];
            }

            if (svgScale) {
                scale *= svgScale;
            }

            svg.attr('transform', 'translate(' + translate[0] + ', ' + translate[1] + ') scale(' + scale + ')');
        })).on('dblclick.zoom', null).append('g').attr('width', '100%').attr('height', '100%');

        svgRelationships = svg.append('g').attr('class', 'relationships');

        svgNodes = svg.append('g').attr('class', 'nodes');
    }

    function appendImageToNode(node) {
        return node.append('image').attr('height', function (d) {
            return icon(d) ? '24px' : '30px';
        }).attr('x', function (d) {
            return icon(d) ? '5px' : '-15px';
        }).attr('xlink:href', function (d) {
            return image(d);
        }).attr('y', function (d) {
            return icon(d) ? '5px' : '-16px';
        }).attr('width', function (d) {
            return icon(d) ? '24px' : '30px';
        });
    }

    function appendInfoPanel(container) {
        return container.append('div').attr('class', 'neo4jd3-info');
    }

    function appendInfoElement(cls, isNode, property, value) {
        var elem = info.append('a');

        elem.attr('href', '#').attr('class', cls).html('<strong>' + property + '</strong>' + (value ? ': ' + value : ''));

        if (!value) {
            elem.style('background-color', function (d) {
                return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : isNode ? class2color(property) : defaultColor();
            }).style('border-color', function (d) {
                return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : isNode ? class2darkenColor(property) : defaultDarkenColor();
            }).style('color', function (d) {
                return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : '#fff';
            });
        }
    }

    function appendInfoElementClass(cls, node) {
        appendInfoElement(cls, true, node);
    }

    function appendInfoElementProperty(cls, property, value) {
        appendInfoElement(cls, false, property, value);
    }

    function appendInfoElementRelationship(cls, relationship) {
        appendInfoElement(cls, false, relationship);
    }

    function appendNode() {
        return node.enter().append('g').attr('class', function (d) {
            var highlight,
                i,
                classes = 'node',
                label = d.labels[0];

            if (icon(d)) {
                classes += ' node-icon';
            }

            if (image(d)) {
                classes += ' node-image';
            }

            if (options.highlight) {
                for (i = 0; i < options.highlight.length; i++) {
                    highlight = options.highlight[i];

                    if (d.labels[0] === highlight.class && d.properties[highlight.property] === highlight.value) {
                        classes += ' node-highlighted';
                        break;
                    }
                }
            }

            return classes;
        }).on('click', function (d) {
            d.fx = d.fy = null;

            if (typeof options.onNodeClick === 'function') {
                options.onNodeClick(d);
            }
        }).on('dblclick', function (d) {
            stickNode(d);

            if (typeof options.onNodeDoubleClick === 'function') {
                options.onNodeDoubleClick(d);
            }
        }).on('mouseenter', function (d) {
            if (info) {
                updateInfo(d);
            }

            if (typeof options.onNodeMouseEnter === 'function') {
                options.onNodeMouseEnter(d);
            }
        }).on('mouseleave', function (d) {
            if (info) {
                clearInfo(d);
            }

            if (typeof options.onNodeMouseLeave === 'function') {
                options.onNodeMouseLeave(d);
            }
        }).call(d3.drag().on('start', dragStarted).on('drag', dragged).on('end', dragEnded));
    }

    function appendNodeToGraph() {
        var n = appendNode();

        appendRingToNode(n);
        appendOutlineToNode(n);

        if (options.icons) {
            appendTextToNode(n);
        }

        if (options.images) {
            appendImageToNode(n);
        }

        return n;
    }

    function appendOutlineToNode(node) {
        return node.append('circle').attr('class', 'outline').attr('r', options.nodeRadius).style('fill', function (d) {
            return options.nodeOutlineFillColor ? options.nodeOutlineFillColor : class2color(d.labels[0]);
        }).style('stroke', function (d) {
            return options.nodeOutlineFillColor ? class2darkenColor(options.nodeOutlineFillColor) : class2darkenColor(d.labels[0]);
        }).append('title').text(function (d) {
            return toString(d);
        });
    }

    function appendRingToNode(node) {
        return node.append('circle').attr('class', 'ring').attr('r', options.nodeRadius * 1.16).append('title').text(function (d) {
            return toString(d);
        });
    }

    function appendTextToNode(node) {
        return node.append('text').attr('class', function (d) {
            return 'text' + (icon(d) ? ' icon' : '');
        }).attr('fill', '#ffffff').attr('font-size', function (d) {
            return icon(d) ? options.nodeRadius + 'px' : '10px';
        }).attr('pointer-events', 'none').attr('text-anchor', 'middle').attr('y', function (d) {
            return icon(d) ? parseInt(Math.round(options.nodeRadius * 0.32)) + 'px' : '4px';
        }).html(function (d) {
            var _icon = icon(d);
            return _icon ? '&#x' + _icon : d.id;
        });
    }

    function appendRandomDataToNode(d, maxNodesToGenerate) {
        var data = randomD3Data(d, maxNodesToGenerate);
        updateWithNeo4jData(data);
    }

    function appendRelationship() {
        return relationship.enter().append('g').attr('class', 'relationship').on('dblclick', function (d) {
            if (typeof options.onRelationshipDoubleClick === 'function') {
                options.onRelationshipDoubleClick(d);
            }
        }).on('mouseenter', function (d) {
            if (info) {
                updateInfo(d);
            }
        });
    }

    function appendOutlineToRelationship(r) {
        return r.append('path').attr('class', 'outline').attr('fill', '#a5abb6').attr('stroke', 'none');
    }

    function appendOverlayToRelationship(r) {
        return r.append('path').attr('class', 'overlay');
    }

    function appendTextToRelationship(r) {
        return r.append('text').attr('class', 'text').attr('fill', '#000000').attr('font-size', '8px').attr('pointer-events', 'none').attr('text-anchor', 'middle').text(function (d) {
            return d.type;
        });
    }

    function appendRelationshipToGraph() {
        var relationship = appendRelationship(),
            text = appendTextToRelationship(relationship),
            outline = appendOutlineToRelationship(relationship),
            overlay = appendOverlayToRelationship(relationship);

        return {
            outline: outline,
            overlay: overlay,
            relationship: relationship,
            text: text
        };
    }

    function class2color(cls) {
        var color = classes2colors[cls];

        if (!color) {
            //            color = options.colors[Math.min(numClasses, options.colors.length - 1)];
            color = options.colors[numClasses % options.colors.length];
            classes2colors[cls] = color;
            numClasses++;
        }

        return color;
    }

    function class2darkenColor(cls) {
        return d3.rgb(class2color(cls)).darker(1);
    }

    function clearInfo() {
        info.html('');
    }

    function color() {
        return options.colors[options.colors.length * Math.random() << 0];
    }

    function colors() {
        // d3.schemeCategory10,
        // d3.schemeCategory20,
        return ['#68bdf6', // light blue
        '#6dce9e', // green #1
        '#faafc2', // light pink
        '#f2baf6', // purple
        '#ff928c', // light red
        '#fcea7e', // light yellow
        '#ffc766', // light orange
        '#405f9e', // navy blue
        '#a5abb6', // dark gray
        '#78cecb', // green #2,
        '#b88cbb', // dark purple
        '#ced2d9', // light gray
        '#e84646', // dark red
        '#fa5f86', // dark pink
        '#ffab1a', // dark orange
        '#fcda19', // dark yellow
        '#797b80', // black
        '#c9d96f', // pistacchio
        '#47991f', // green #3
        '#70edee', // turquoise
        '#ff75ea' // pink
        ];
    }

    function contains(array, id) {
        var filter = array.filter(function (elem) {
            return elem.id === id;
        });

        return filter.length > 0;
    }

    function defaultColor() {
        return options.relationshipColor;
    }

    function defaultDarkenColor() {
        return d3.rgb(options.colors[options.colors.length - 1]).darker(1);
    }

    function dragEnded(d) {
        if (!d3.event.active) {
            simulation.alphaTarget(0);
        }

        if (typeof options.onNodeDragEnd === 'function') {
            options.onNodeDragEnd(d);
        }
    }

    function dragged(d) {
        stickNode(d);
    }

    function dragStarted(d) {
        if (!d3.event.active) {
            simulation.alphaTarget(0.3).restart();
        }

        d.fx = d.x;
        d.fy = d.y;

        if (typeof options.onNodeDragStart === 'function') {
            options.onNodeDragStart(d);
        }
    }

    function extend(obj1, obj2) {
        var obj = {};

        merge(obj, obj1);
        merge(obj, obj2);

        return obj;
    }

    function fontAwesomeIcons() {
        return { 'glass': 'f000', 'music': 'f001', 'search': 'f002', 'envelope-o': 'f003', 'heart': 'f004', 'star': 'f005', 'star-o': 'f006', 'user': 'f007', 'film': 'f008', 'th-large': 'f009', 'th': 'f00a', 'th-list': 'f00b', 'check': 'f00c', 'remove,close,times': 'f00d', 'search-plus': 'f00e', 'search-minus': 'f010', 'power-off': 'f011', 'signal': 'f012', 'gear,cog': 'f013', 'trash-o': 'f014', 'home': 'f015', 'file-o': 'f016', 'clock-o': 'f017', 'road': 'f018', 'download': 'f019', 'arrow-circle-o-down': 'f01a', 'arrow-circle-o-up': 'f01b', 'inbox': 'f01c', 'play-circle-o': 'f01d', 'rotate-right,repeat': 'f01e', 'refresh': 'f021', 'list-alt': 'f022', 'lock': 'f023', 'flag': 'f024', 'headphones': 'f025', 'volume-off': 'f026', 'volume-down': 'f027', 'volume-up': 'f028', 'qrcode': 'f029', 'barcode': 'f02a', 'tag': 'f02b', 'tags': 'f02c', 'book': 'f02d', 'bookmark': 'f02e', 'print': 'f02f', 'camera': 'f030', 'font': 'f031', 'bold': 'f032', 'italic': 'f033', 'text-height': 'f034', 'text-width': 'f035', 'align-left': 'f036', 'align-center': 'f037', 'align-right': 'f038', 'align-justify': 'f039', 'list': 'f03a', 'dedent,outdent': 'f03b', 'indent': 'f03c', 'video-camera': 'f03d', 'photo,image,picture-o': 'f03e', 'pencil': 'f040', 'map-marker': 'f041', 'adjust': 'f042', 'tint': 'f043', 'edit,pencil-square-o': 'f044', 'share-square-o': 'f045', 'check-square-o': 'f046', 'arrows': 'f047', 'step-backward': 'f048', 'fast-backward': 'f049', 'backward': 'f04a', 'play': 'f04b', 'pause': 'f04c', 'stop': 'f04d', 'forward': 'f04e', 'fast-forward': 'f050', 'step-forward': 'f051', 'eject': 'f052', 'chevron-left': 'f053', 'chevron-right': 'f054', 'plus-circle': 'f055', 'minus-circle': 'f056', 'times-circle': 'f057', 'check-circle': 'f058', 'question-circle': 'f059', 'info-circle': 'f05a', 'crosshairs': 'f05b', 'times-circle-o': 'f05c', 'check-circle-o': 'f05d', 'ban': 'f05e', 'arrow-left': 'f060', 'arrow-right': 'f061', 'arrow-up': 'f062', 'arrow-down': 'f063', 'mail-forward,share': 'f064', 'expand': 'f065', 'compress': 'f066', 'plus': 'f067', 'minus': 'f068', 'asterisk': 'f069', 'exclamation-circle': 'f06a', 'gift': 'f06b', 'leaf': 'f06c', 'fire': 'f06d', 'eye': 'f06e', 'eye-slash': 'f070', 'warning,exclamation-triangle': 'f071', 'plane': 'f072', 'calendar': 'f073', 'random': 'f074', 'comment': 'f075', 'magnet': 'f076', 'chevron-up': 'f077', 'chevron-down': 'f078', 'retweet': 'f079', 'shopping-cart': 'f07a', 'folder': 'f07b', 'folder-open': 'f07c', 'arrows-v': 'f07d', 'arrows-h': 'f07e', 'bar-chart-o,bar-chart': 'f080', 'twitter-square': 'f081', 'facebook-square': 'f082', 'camera-retro': 'f083', 'key': 'f084', 'gears,cogs': 'f085', 'comments': 'f086', 'thumbs-o-up': 'f087', 'thumbs-o-down': 'f088', 'star-half': 'f089', 'heart-o': 'f08a', 'sign-out': 'f08b', 'linkedin-square': 'f08c', 'thumb-tack': 'f08d', 'external-link': 'f08e', 'sign-in': 'f090', 'trophy': 'f091', 'github-square': 'f092', 'upload': 'f093', 'lemon-o': 'f094', 'phone': 'f095', 'square-o': 'f096', 'bookmark-o': 'f097', 'phone-square': 'f098', 'twitter': 'f099', 'facebook-f,facebook': 'f09a', 'github': 'f09b', 'unlock': 'f09c', 'credit-card': 'f09d', 'feed,rss': 'f09e', 'hdd-o': 'f0a0', 'bullhorn': 'f0a1', 'bell': 'f0f3', 'certificate': 'f0a3', 'hand-o-right': 'f0a4', 'hand-o-left': 'f0a5', 'hand-o-up': 'f0a6', 'hand-o-down': 'f0a7', 'arrow-circle-left': 'f0a8', 'arrow-circle-right': 'f0a9', 'arrow-circle-up': 'f0aa', 'arrow-circle-down': 'f0ab', 'globe': 'f0ac', 'wrench': 'f0ad', 'tasks': 'f0ae', 'filter': 'f0b0', 'briefcase': 'f0b1', 'arrows-alt': 'f0b2', 'group,users': 'f0c0', 'chain,link': 'f0c1', 'cloud': 'f0c2', 'flask': 'f0c3', 'cut,scissors': 'f0c4', 'copy,files-o': 'f0c5', 'paperclip': 'f0c6', 'save,floppy-o': 'f0c7', 'square': 'f0c8', 'navicon,reorder,bars': 'f0c9', 'list-ul': 'f0ca', 'list-ol': 'f0cb', 'strikethrough': 'f0cc', 'underline': 'f0cd', 'table': 'f0ce', 'magic': 'f0d0', 'truck': 'f0d1', 'pinterest': 'f0d2', 'pinterest-square': 'f0d3', 'google-plus-square': 'f0d4', 'google-plus': 'f0d5', 'money': 'f0d6', 'caret-down': 'f0d7', 'caret-up': 'f0d8', 'caret-left': 'f0d9', 'caret-right': 'f0da', 'columns': 'f0db', 'unsorted,sort': 'f0dc', 'sort-down,sort-desc': 'f0dd', 'sort-up,sort-asc': 'f0de', 'envelope': 'f0e0', 'linkedin': 'f0e1', 'rotate-left,undo': 'f0e2', 'legal,gavel': 'f0e3', 'dashboard,tachometer': 'f0e4', 'comment-o': 'f0e5', 'comments-o': 'f0e6', 'flash,bolt': 'f0e7', 'sitemap': 'f0e8', 'umbrella': 'f0e9', 'paste,clipboard': 'f0ea', 'lightbulb-o': 'f0eb', 'exchange': 'f0ec', 'cloud-download': 'f0ed', 'cloud-upload': 'f0ee', 'user-md': 'f0f0', 'stethoscope': 'f0f1', 'suitcase': 'f0f2', 'bell-o': 'f0a2', 'coffee': 'f0f4', 'cutlery': 'f0f5', 'file-text-o': 'f0f6', 'building-o': 'f0f7', 'hospital-o': 'f0f8', 'ambulance': 'f0f9', 'medkit': 'f0fa', 'fighter-jet': 'f0fb', 'beer': 'f0fc', 'h-square': 'f0fd', 'plus-square': 'f0fe', 'angle-double-left': 'f100', 'angle-double-right': 'f101', 'angle-double-up': 'f102', 'angle-double-down': 'f103', 'angle-left': 'f104', 'angle-right': 'f105', 'angle-up': 'f106', 'angle-down': 'f107', 'desktop': 'f108', 'laptop': 'f109', 'tablet': 'f10a', 'mobile-phone,mobile': 'f10b', 'circle-o': 'f10c', 'quote-left': 'f10d', 'quote-right': 'f10e', 'spinner': 'f110', 'circle': 'f111', 'mail-reply,reply': 'f112', 'github-alt': 'f113', 'folder-o': 'f114', 'folder-open-o': 'f115', 'smile-o': 'f118', 'frown-o': 'f119', 'meh-o': 'f11a', 'gamepad': 'f11b', 'keyboard-o': 'f11c', 'flag-o': 'f11d', 'flag-checkered': 'f11e', 'terminal': 'f120', 'code': 'f121', 'mail-reply-all,reply-all': 'f122', 'star-half-empty,star-half-full,star-half-o': 'f123', 'location-arrow': 'f124', 'crop': 'f125', 'code-fork': 'f126', 'unlink,chain-broken': 'f127', 'question': 'f128', 'info': 'f129', 'exclamation': 'f12a', 'superscript': 'f12b', 'subscript': 'f12c', 'eraser': 'f12d', 'puzzle-piece': 'f12e', 'microphone': 'f130', 'microphone-slash': 'f131', 'shield': 'f132', 'calendar-o': 'f133', 'fire-extinguisher': 'f134', 'rocket': 'f135', 'maxcdn': 'f136', 'chevron-circle-left': 'f137', 'chevron-circle-right': 'f138', 'chevron-circle-up': 'f139', 'chevron-circle-down': 'f13a', 'html5': 'f13b', 'css3': 'f13c', 'anchor': 'f13d', 'unlock-alt': 'f13e', 'bullseye': 'f140', 'ellipsis-h': 'f141', 'ellipsis-v': 'f142', 'rss-square': 'f143', 'play-circle': 'f144', 'ticket': 'f145', 'minus-square': 'f146', 'minus-square-o': 'f147', 'level-up': 'f148', 'level-down': 'f149', 'check-square': 'f14a', 'pencil-square': 'f14b', 'external-link-square': 'f14c', 'share-square': 'f14d', 'compass': 'f14e', 'toggle-down,caret-square-o-down': 'f150', 'toggle-up,caret-square-o-up': 'f151', 'toggle-right,caret-square-o-right': 'f152', 'euro,eur': 'f153', 'gbp': 'f154', 'dollar,usd': 'f155', 'rupee,inr': 'f156', 'cny,rmb,yen,jpy': 'f157', 'ruble,rouble,rub': 'f158', 'won,krw': 'f159', 'bitcoin,btc': 'f15a', 'file': 'f15b', 'file-text': 'f15c', 'sort-alpha-asc': 'f15d', 'sort-alpha-desc': 'f15e', 'sort-amount-asc': 'f160', 'sort-amount-desc': 'f161', 'sort-numeric-asc': 'f162', 'sort-numeric-desc': 'f163', 'thumbs-up': 'f164', 'thumbs-down': 'f165', 'youtube-square': 'f166', 'youtube': 'f167', 'xing': 'f168', 'xing-square': 'f169', 'youtube-play': 'f16a', 'dropbox': 'f16b', 'stack-overflow': 'f16c', 'instagram': 'f16d', 'flickr': 'f16e', 'adn': 'f170', 'bitbucket': 'f171', 'bitbucket-square': 'f172', 'tumblr': 'f173', 'tumblr-square': 'f174', 'long-arrow-down': 'f175', 'long-arrow-up': 'f176', 'long-arrow-left': 'f177', 'long-arrow-right': 'f178', 'apple': 'f179', 'windows': 'f17a', 'android': 'f17b', 'linux': 'f17c', 'dribbble': 'f17d', 'skype': 'f17e', 'foursquare': 'f180', 'trello': 'f181', 'female': 'f182', 'male': 'f183', 'gittip,gratipay': 'f184', 'sun-o': 'f185', 'moon-o': 'f186', 'archive': 'f187', 'bug': 'f188', 'vk': 'f189', 'weibo': 'f18a', 'renren': 'f18b', 'pagelines': 'f18c', 'stack-exchange': 'f18d', 'arrow-circle-o-right': 'f18e', 'arrow-circle-o-left': 'f190', 'toggle-left,caret-square-o-left': 'f191', 'dot-circle-o': 'f192', 'wheelchair': 'f193', 'vimeo-square': 'f194', 'turkish-lira,try': 'f195', 'plus-square-o': 'f196', 'space-shuttle': 'f197', 'slack': 'f198', 'envelope-square': 'f199', 'wordpress': 'f19a', 'openid': 'f19b', 'institution,bank,university': 'f19c', 'mortar-board,graduation-cap': 'f19d', 'yahoo': 'f19e', 'google': 'f1a0', 'reddit': 'f1a1', 'reddit-square': 'f1a2', 'stumbleupon-circle': 'f1a3', 'stumbleupon': 'f1a4', 'delicious': 'f1a5', 'digg': 'f1a6', 'pied-piper-pp': 'f1a7', 'pied-piper-alt': 'f1a8', 'drupal': 'f1a9', 'joomla': 'f1aa', 'language': 'f1ab', 'fax': 'f1ac', 'building': 'f1ad', 'child': 'f1ae', 'paw': 'f1b0', 'spoon': 'f1b1', 'cube': 'f1b2', 'cubes': 'f1b3', 'behance': 'f1b4', 'behance-square': 'f1b5', 'steam': 'f1b6', 'steam-square': 'f1b7', 'recycle': 'f1b8', 'automobile,car': 'f1b9', 'cab,taxi': 'f1ba', 'tree': 'f1bb', 'spotify': 'f1bc', 'deviantart': 'f1bd', 'soundcloud': 'f1be', 'database': 'f1c0', 'file-pdf-o': 'f1c1', 'file-word-o': 'f1c2', 'file-excel-o': 'f1c3', 'file-powerpoint-o': 'f1c4', 'file-photo-o,file-picture-o,file-image-o': 'f1c5', 'file-zip-o,file-archive-o': 'f1c6', 'file-sound-o,file-audio-o': 'f1c7', 'file-movie-o,file-video-o': 'f1c8', 'file-code-o': 'f1c9', 'vine': 'f1ca', 'codepen': 'f1cb', 'jsfiddle': 'f1cc', 'life-bouy,life-buoy,life-saver,support,life-ring': 'f1cd', 'circle-o-notch': 'f1ce', 'ra,resistance,rebel': 'f1d0', 'ge,empire': 'f1d1', 'git-square': 'f1d2', 'git': 'f1d3', 'y-combinator-square,yc-square,hacker-news': 'f1d4', 'tencent-weibo': 'f1d5', 'qq': 'f1d6', 'wechat,weixin': 'f1d7', 'send,paper-plane': 'f1d8', 'send-o,paper-plane-o': 'f1d9', 'history': 'f1da', 'circle-thin': 'f1db', 'header': 'f1dc', 'paragraph': 'f1dd', 'sliders': 'f1de', 'share-alt': 'f1e0', 'share-alt-square': 'f1e1', 'bomb': 'f1e2', 'soccer-ball-o,futbol-o': 'f1e3', 'tty': 'f1e4', 'binoculars': 'f1e5', 'plug': 'f1e6', 'slideshare': 'f1e7', 'twitch': 'f1e8', 'yelp': 'f1e9', 'newspaper-o': 'f1ea', 'wifi': 'f1eb', 'calculator': 'f1ec', 'paypal': 'f1ed', 'google-wallet': 'f1ee', 'cc-visa': 'f1f0', 'cc-mastercard': 'f1f1', 'cc-discover': 'f1f2', 'cc-amex': 'f1f3', 'cc-paypal': 'f1f4', 'cc-stripe': 'f1f5', 'bell-slash': 'f1f6', 'bell-slash-o': 'f1f7', 'trash': 'f1f8', 'copyright': 'f1f9', 'at': 'f1fa', 'eyedropper': 'f1fb', 'paint-brush': 'f1fc', 'birthday-cake': 'f1fd', 'area-chart': 'f1fe', 'pie-chart': 'f200', 'line-chart': 'f201', 'lastfm': 'f202', 'lastfm-square': 'f203', 'toggle-off': 'f204', 'toggle-on': 'f205', 'bicycle': 'f206', 'bus': 'f207', 'ioxhost': 'f208', 'angellist': 'f209', 'cc': 'f20a', 'shekel,sheqel,ils': 'f20b', 'meanpath': 'f20c', 'buysellads': 'f20d', 'connectdevelop': 'f20e', 'dashcube': 'f210', 'forumbee': 'f211', 'leanpub': 'f212', 'sellsy': 'f213', 'shirtsinbulk': 'f214', 'simplybuilt': 'f215', 'skyatlas': 'f216', 'cart-plus': 'f217', 'cart-arrow-down': 'f218', 'diamond': 'f219', 'ship': 'f21a', 'user-secret': 'f21b', 'motorcycle': 'f21c', 'street-view': 'f21d', 'heartbeat': 'f21e', 'venus': 'f221', 'mars': 'f222', 'mercury': 'f223', 'intersex,transgender': 'f224', 'transgender-alt': 'f225', 'venus-double': 'f226', 'mars-double': 'f227', 'venus-mars': 'f228', 'mars-stroke': 'f229', 'mars-stroke-v': 'f22a', 'mars-stroke-h': 'f22b', 'neuter': 'f22c', 'genderless': 'f22d', 'facebook-official': 'f230', 'pinterest-p': 'f231', 'whatsapp': 'f232', 'server': 'f233', 'user-plus': 'f234', 'user-times': 'f235', 'hotel,bed': 'f236', 'viacoin': 'f237', 'train': 'f238', 'subway': 'f239', 'medium': 'f23a', 'yc,y-combinator': 'f23b', 'optin-monster': 'f23c', 'opencart': 'f23d', 'expeditedssl': 'f23e', 'battery-4,battery-full': 'f240', 'battery-3,battery-three-quarters': 'f241', 'battery-2,battery-half': 'f242', 'battery-1,battery-quarter': 'f243', 'battery-0,battery-empty': 'f244', 'mouse-pointer': 'f245', 'i-cursor': 'f246', 'object-group': 'f247', 'object-ungroup': 'f248', 'sticky-note': 'f249', 'sticky-note-o': 'f24a', 'cc-jcb': 'f24b', 'cc-diners-club': 'f24c', 'clone': 'f24d', 'balance-scale': 'f24e', 'hourglass-o': 'f250', 'hourglass-1,hourglass-start': 'f251', 'hourglass-2,hourglass-half': 'f252', 'hourglass-3,hourglass-end': 'f253', 'hourglass': 'f254', 'hand-grab-o,hand-rock-o': 'f255', 'hand-stop-o,hand-paper-o': 'f256', 'hand-scissors-o': 'f257', 'hand-lizard-o': 'f258', 'hand-spock-o': 'f259', 'hand-pointer-o': 'f25a', 'hand-peace-o': 'f25b', 'trademark': 'f25c', 'registered': 'f25d', 'creative-commons': 'f25e', 'gg': 'f260', 'gg-circle': 'f261', 'tripadvisor': 'f262', 'odnoklassniki': 'f263', 'odnoklassniki-square': 'f264', 'get-pocket': 'f265', 'wikipedia-w': 'f266', 'safari': 'f267', 'chrome': 'f268', 'firefox': 'f269', 'opera': 'f26a', 'internet-explorer': 'f26b', 'tv,television': 'f26c', 'contao': 'f26d', '500px': 'f26e', 'amazon': 'f270', 'calendar-plus-o': 'f271', 'calendar-minus-o': 'f272', 'calendar-times-o': 'f273', 'calendar-check-o': 'f274', 'industry': 'f275', 'map-pin': 'f276', 'map-signs': 'f277', 'map-o': 'f278', 'map': 'f279', 'commenting': 'f27a', 'commenting-o': 'f27b', 'houzz': 'f27c', 'vimeo': 'f27d', 'black-tie': 'f27e', 'fonticons': 'f280', 'reddit-alien': 'f281', 'edge': 'f282', 'credit-card-alt': 'f283', 'codiepie': 'f284', 'modx': 'f285', 'fort-awesome': 'f286', 'usb': 'f287', 'product-hunt': 'f288', 'mixcloud': 'f289', 'scribd': 'f28a', 'pause-circle': 'f28b', 'pause-circle-o': 'f28c', 'stop-circle': 'f28d', 'stop-circle-o': 'f28e', 'shopping-bag': 'f290', 'shopping-basket': 'f291', 'hashtag': 'f292', 'bluetooth': 'f293', 'bluetooth-b': 'f294', 'percent': 'f295', 'gitlab': 'f296', 'wpbeginner': 'f297', 'wpforms': 'f298', 'envira': 'f299', 'universal-access': 'f29a', 'wheelchair-alt': 'f29b', 'question-circle-o': 'f29c', 'blind': 'f29d', 'audio-description': 'f29e', 'volume-control-phone': 'f2a0', 'braille': 'f2a1', 'assistive-listening-systems': 'f2a2', 'asl-interpreting,american-sign-language-interpreting': 'f2a3', 'deafness,hard-of-hearing,deaf': 'f2a4', 'glide': 'f2a5', 'glide-g': 'f2a6', 'signing,sign-language': 'f2a7', 'low-vision': 'f2a8', 'viadeo': 'f2a9', 'viadeo-square': 'f2aa', 'snapchat': 'f2ab', 'snapchat-ghost': 'f2ac', 'snapchat-square': 'f2ad', 'pied-piper': 'f2ae', 'first-order': 'f2b0', 'yoast': 'f2b1', 'themeisle': 'f2b2', 'google-plus-circle,google-plus-official': 'f2b3', 'fa,font-awesome': 'f2b4' };
    }

    function icon(d) {
        var code;

        if (options.iconMap && options.showIcons && options.icons) {
            if (options.icons[d.labels[0]] && options.iconMap[options.icons[d.labels[0]]]) {
                code = options.iconMap[options.icons[d.labels[0]]];
            } else if (options.iconMap[d.labels[0]]) {
                code = options.iconMap[d.labels[0]];
            } else if (options.icons[d.labels[0]]) {
                code = options.icons[d.labels[0]];
            }
        }

        return code;
    }

    function image(d) {
        var i, imagesForLabel, img, imgLevel, label, labelPropertyValue, property, value;

        if (options.images) {
            imagesForLabel = options.imageMap[d.labels[0]];

            if (imagesForLabel) {
                imgLevel = 0;

                for (i = 0; i < imagesForLabel.length; i++) {
                    labelPropertyValue = imagesForLabel[i].split('|');

                    switch (labelPropertyValue.length) {
                        case 3:
                            value = labelPropertyValue[2];
                        /* falls through */
                        case 2:
                            property = labelPropertyValue[1];
                        /* falls through */
                        case 1:
                            label = labelPropertyValue[0];
                    }

                    if (d.labels[0] === label && (!property || d.properties[property] !== undefined) && (!value || d.properties[property] === value)) {
                        if (labelPropertyValue.length > imgLevel) {
                            img = options.images[imagesForLabel[i]];
                            imgLevel = labelPropertyValue.length;
                        }
                    }
                }
            }
        }

        return img;
    }

    function init(_selector, _options) {
        initIconMap();

        merge(options, _options);

        if (options.icons) {
            options.showIcons = true;
        }

        if (!options.minCollision) {
            options.minCollision = options.nodeRadius * 2;
        }

        initImageMap();

        selector = _selector;

        container = d3.select(selector);

        container.attr('class', 'neo4jd3').html('');

        if (options.infoPanel) {
            info = appendInfoPanel(container);
        }

        appendGraph(container);

        simulation = initSimulation();

        if (options.neo4jData) {
            loadNeo4jData(options.neo4jData);
        } else if (options.neo4jDataUrl) {
            loadNeo4jDataFromUrl(options.neo4jDataUrl);
        } else {
            console.error('Error: both neo4jData and neo4jDataUrl are empty!');
        }
    }

    function initIconMap() {
        Object.keys(options.iconMap).forEach(function (key, index) {
            var keys = key.split(','),
                value = options.iconMap[key];

            keys.forEach(function (key) {
                options.iconMap[key] = value;
            });
        });
    }

    function initImageMap() {
        var key, keys, selector;

        for (key in options.images) {
            if (options.images.hasOwnProperty(key)) {
                keys = key.split('|');

                if (!options.imageMap[keys[0]]) {
                    options.imageMap[keys[0]] = [key];
                } else {
                    options.imageMap[keys[0]].push(key);
                }
            }
        }
    }

    function initSimulation() {
        var simulation = d3.forceSimulation()
        //                           .velocityDecay(0.8)
        //                           .force('x', d3.force().strength(0.002))
        //                           .force('y', d3.force().strength(0.002))
        .force('collide', d3.forceCollide().radius(function (d) {
            return options.minCollision;
        }).iterations(2)).force('charge', d3.forceManyBody()).force('link', d3.forceLink().id(function (d) {
            return d.id;
        })).force('center', d3.forceCenter(svg.node().parentElement.parentElement.clientWidth / 2, svg.node().parentElement.parentElement.clientHeight / 2)).on('tick', function () {
            tick();
        }).on('end', function () {
            if (options.zoomFit && !justLoaded) {
                justLoaded = true;
                zoomFit(2);
            }
        });

        return simulation;
    }

    function loadNeo4jData() {
        nodes = [];
        relationships = [];

        updateWithNeo4jData(options.neo4jData);
    }

    function loadNeo4jDataFromUrl(neo4jDataUrl) {
        nodes = [];
        relationships = [];

        d3.json(neo4jDataUrl, function (error, data) {
            if (error) {
                throw error;
            }

            updateWithNeo4jData(data);
        });
    }

    function merge(target, source) {
        Object.keys(source).forEach(function (property) {
            target[property] = source[property];
        });
    }

    function neo4jDataToD3Data(data) {
        var graph = {
            nodes: [],
            relationships: []
        };

        data.results.forEach(function (result) {
            result.data.forEach(function (data) {
                data.graph.nodes.forEach(function (node) {
                    if (!contains(graph.nodes, node.id)) {
                        graph.nodes.push(node);
                    }
                });

                data.graph.relationships.forEach(function (relationship) {
                    relationship.source = relationship.startNode;
                    relationship.target = relationship.endNode;
                    graph.relationships.push(relationship);
                });

                data.graph.relationships.sort(function (a, b) {
                    if (a.source > b.source) {
                        return 1;
                    } else if (a.source < b.source) {
                        return -1;
                    } else {
                        if (a.target > b.target) {
                            return 1;
                        }

                        if (a.target < b.target) {
                            return -1;
                        } else {
                            return 0;
                        }
                    }
                });

                for (var i = 0; i < data.graph.relationships.length; i++) {
                    if (i !== 0 && data.graph.relationships[i].source === data.graph.relationships[i - 1].source && data.graph.relationships[i].target === data.graph.relationships[i - 1].target) {
                        data.graph.relationships[i].linknum = data.graph.relationships[i - 1].linknum + 1;
                    } else {
                        data.graph.relationships[i].linknum = 1;
                    }
                }
            });
        });

        return graph;
    }

    function randomD3Data(d, maxNodesToGenerate) {
        var data = {
            nodes: [],
            relationships: []
        },
            i,
            label,
            node,
            numNodes = (maxNodesToGenerate * Math.random() << 0) + 1,
            relationship,
            s = size();

        for (i = 0; i < numNodes; i++) {
            label = randomLabel();

            node = {
                id: s.nodes + 1 + i,
                labels: [label],
                properties: {
                    random: label
                },
                x: d.x,
                y: d.y
            };

            data.nodes[data.nodes.length] = node;

            relationship = {
                id: s.relationships + 1 + i,
                type: label.toUpperCase(),
                startNode: d.id,
                endNode: s.nodes + 1 + i,
                properties: {
                    from: Date.now()
                },
                source: d.id,
                target: s.nodes + 1 + i,
                linknum: s.relationships + 1 + i
            };

            data.relationships[data.relationships.length] = relationship;
        }

        return data;
    }

    function randomLabel() {
        var icons = Object.keys(options.iconMap);
        return icons[icons.length * Math.random() << 0];
    }

    function rotate(cx, cy, x, y, angle) {
        var radians = Math.PI / 180 * angle,
            cos = Math.cos(radians),
            sin = Math.sin(radians),
            nx = cos * (x - cx) + sin * (y - cy) + cx,
            ny = cos * (y - cy) - sin * (x - cx) + cy;

        return { x: nx, y: ny };
    }

    function rotatePoint(c, p, angle) {
        return rotate(c.x, c.y, p.x, p.y, angle);
    }

    function rotation(source, target) {
        return Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI;
    }

    function size() {
        return {
            nodes: nodes.length,
            relationships: relationships.length
        };
    }
    /*
        function smoothTransform(elem, translate, scale) {
            var animationMilliseconds = 5000,
                timeoutMilliseconds = 50,
                steps = parseInt(animationMilliseconds / timeoutMilliseconds);
    
            setTimeout(function() {
                smoothTransformStep(elem, translate, scale, timeoutMilliseconds, 1, steps);
            }, timeoutMilliseconds);
        }
    
        function smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step, steps) {
            var progress = step / steps;
    
            elem.attr('transform', 'translate(' + (translate[0] * progress) + ', ' + (translate[1] * progress) + ') scale(' + (scale * progress) + ')');
    
            if (step < steps) {
                setTimeout(function() {
                    smoothTransformStep(elem, translate, scale, timeoutMilliseconds, step + 1, steps);
                }, timeoutMilliseconds);
            }
        }
    */
    function stickNode(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function tick() {
        tickNodes();
        tickRelationships();
    }

    function tickNodes() {
        if (node) {
            node.attr('transform', function (d) {
                return 'translate(' + d.x + ', ' + d.y + ')';
            });
        }
    }

    function tickRelationships() {
        if (relationship) {
            relationship.attr('transform', function (d) {
                var angle = rotation(d.source, d.target);
                return 'translate(' + d.source.x + ', ' + d.source.y + ') rotate(' + angle + ')';
            });

            tickRelationshipsTexts();
            tickRelationshipsOutlines();
            tickRelationshipsOverlays();
        }
    }

    function tickRelationshipsOutlines() {
        relationship.each(function (relationship) {
            var rel = d3.select(this),
                outline = rel.select('.outline'),
                text = rel.select('.text'),
                bbox = text.node().getBBox(),
                padding = 3;

            outline.attr('d', function (d) {
                var center = { x: 0, y: 0 },
                    angle = rotation(d.source, d.target),
                    textBoundingBox = text.node().getBBox(),
                    textPadding = 5,
                    u = unitaryVector(d.source, d.target),
                    textMargin = { x: (d.target.x - d.source.x - (textBoundingBox.width + textPadding) * u.x) * 0.5, y: (d.target.y - d.source.y - (textBoundingBox.width + textPadding) * u.y) * 0.5 },
                    n = unitaryNormalVector(d.source, d.target),
                    rotatedPointA1 = rotatePoint(center, { x: 0 + (options.nodeRadius + 1) * u.x - n.x, y: 0 + (options.nodeRadius + 1) * u.y - n.y }, angle),
                    rotatedPointB1 = rotatePoint(center, { x: textMargin.x - n.x, y: textMargin.y - n.y }, angle),
                    rotatedPointC1 = rotatePoint(center, { x: textMargin.x, y: textMargin.y }, angle),
                    rotatedPointD1 = rotatePoint(center, { x: 0 + (options.nodeRadius + 1) * u.x, y: 0 + (options.nodeRadius + 1) * u.y }, angle),
                    rotatedPointA2 = rotatePoint(center, { x: d.target.x - d.source.x - textMargin.x - n.x, y: d.target.y - d.source.y - textMargin.y - n.y }, angle),
                    rotatedPointB2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - n.x - u.x * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - n.y - u.y * options.arrowSize }, angle),
                    rotatedPointC2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - n.x + (n.x - u.x) * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - n.y + (n.y - u.y) * options.arrowSize }, angle),
                    rotatedPointD2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y }, angle),
                    rotatedPointE2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x + (-n.x - u.x) * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y + (-n.y - u.y) * options.arrowSize }, angle),
                    rotatedPointF2 = rotatePoint(center, { x: d.target.x - d.source.x - (options.nodeRadius + 1) * u.x - u.x * options.arrowSize, y: d.target.y - d.source.y - (options.nodeRadius + 1) * u.y - u.y * options.arrowSize }, angle),
                    rotatedPointG2 = rotatePoint(center, { x: d.target.x - d.source.x - textMargin.x, y: d.target.y - d.source.y - textMargin.y }, angle);

                return 'M ' + rotatedPointA1.x + ' ' + rotatedPointA1.y + ' L ' + rotatedPointB1.x + ' ' + rotatedPointB1.y + ' L ' + rotatedPointC1.x + ' ' + rotatedPointC1.y + ' L ' + rotatedPointD1.x + ' ' + rotatedPointD1.y + ' Z M ' + rotatedPointA2.x + ' ' + rotatedPointA2.y + ' L ' + rotatedPointB2.x + ' ' + rotatedPointB2.y + ' L ' + rotatedPointC2.x + ' ' + rotatedPointC2.y + ' L ' + rotatedPointD2.x + ' ' + rotatedPointD2.y + ' L ' + rotatedPointE2.x + ' ' + rotatedPointE2.y + ' L ' + rotatedPointF2.x + ' ' + rotatedPointF2.y + ' L ' + rotatedPointG2.x + ' ' + rotatedPointG2.y + ' Z';
            });
        });
    }

    function tickRelationshipsOverlays() {
        relationshipOverlay.attr('d', function (d) {
            var center = { x: 0, y: 0 },
                angle = rotation(d.source, d.target),
                n1 = unitaryNormalVector(d.source, d.target),
                n = unitaryNormalVector(d.source, d.target, 50),
                rotatedPointA = rotatePoint(center, { x: 0 - n.x, y: 0 - n.y }, angle),
                rotatedPointB = rotatePoint(center, { x: d.target.x - d.source.x - n.x, y: d.target.y - d.source.y - n.y }, angle),
                rotatedPointC = rotatePoint(center, { x: d.target.x - d.source.x + n.x - n1.x, y: d.target.y - d.source.y + n.y - n1.y }, angle),
                rotatedPointD = rotatePoint(center, { x: 0 + n.x - n1.x, y: 0 + n.y - n1.y }, angle);

            return 'M ' + rotatedPointA.x + ' ' + rotatedPointA.y + ' L ' + rotatedPointB.x + ' ' + rotatedPointB.y + ' L ' + rotatedPointC.x + ' ' + rotatedPointC.y + ' L ' + rotatedPointD.x + ' ' + rotatedPointD.y + ' Z';
        });
    }

    function tickRelationshipsTexts() {
        relationshipText.attr('transform', function (d) {
            var angle = (rotation(d.source, d.target) + 360) % 360,
                mirror = angle > 90 && angle < 270,
                center = { x: 0, y: 0 },
                n = unitaryNormalVector(d.source, d.target),
                nWeight = mirror ? 2 : -3,
                point = { x: (d.target.x - d.source.x) * 0.5 + n.x * nWeight, y: (d.target.y - d.source.y) * 0.5 + n.y * nWeight },
                rotatedPoint = rotatePoint(center, point, angle);

            return 'translate(' + rotatedPoint.x + ', ' + rotatedPoint.y + ') rotate(' + (mirror ? 180 : 0) + ')';
        });
    }

    function toString(d) {
        var s = d.labels ? d.labels[0] : d.type;

        s += ' (<id>: ' + d.id;

        Object.keys(d.properties).forEach(function (property) {
            s += ', ' + property + ': ' + JSON.stringify(d.properties[property]);
        });

        s += ')';

        return s;
    }

    function unitaryNormalVector(source, target, newLength) {
        var center = { x: 0, y: 0 },
            vector = unitaryVector(source, target, newLength);

        return rotatePoint(center, vector, 90);
    }

    function unitaryVector(source, target, newLength) {
        var length = Math.sqrt(Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)) / Math.sqrt(newLength || 1);

        return {
            x: (target.x - source.x) / length,
            y: (target.y - source.y) / length
        };
    }

    function updateWithD3Data(d3Data) {
        updateNodesAndRelationships(d3Data.nodes, d3Data.relationships);
    }

    function updateWithNeo4jData(neo4jData) {
        var d3Data = neo4jDataToD3Data(neo4jData);
        updateWithD3Data(d3Data);
    }

    function updateInfo(d) {
        clearInfo();

        if (d.labels) {
            appendInfoElementClass('class', d.labels[0]);
        } else {
            appendInfoElementRelationship('class', d.type);
        }

        appendInfoElementProperty('property', '&lt;id&gt;', d.id);

        Object.keys(d.properties).forEach(function (property) {
            appendInfoElementProperty('property', property, JSON.stringify(d.properties[property]));
        });
    }

    function updateNodes(n) {
        Array.prototype.push.apply(nodes, n);

        node = svgNodes.selectAll('.node').data(nodes, function (d) {
            return d.id;
        });
        var nodeEnter = appendNodeToGraph();
        node = nodeEnter.merge(node);
    }

    function updateNodesAndRelationships(n, r) {
        updateRelationships(r);
        updateNodes(n);

        simulation.nodes(nodes);
        simulation.force('link').links(relationships);
    }

    function updateRelationships(r) {
        Array.prototype.push.apply(relationships, r);

        relationship = svgRelationships.selectAll('.relationship').data(relationships, function (d) {
            return d.id;
        });

        var relationshipEnter = appendRelationshipToGraph();

        relationship = relationshipEnter.relationship.merge(relationship);

        relationshipOutline = svg.selectAll('.relationship .outline');
        relationshipOutline = relationshipEnter.outline.merge(relationshipOutline);

        relationshipOverlay = svg.selectAll('.relationship .overlay');
        relationshipOverlay = relationshipEnter.overlay.merge(relationshipOverlay);

        relationshipText = svg.selectAll('.relationship .text');
        relationshipText = relationshipEnter.text.merge(relationshipText);
    }

    function version() {
        return VERSION;
    }

    function zoomFit(transitionDuration) {
        var bounds = svg.node().getBBox(),
            parent = svg.node().parentElement.parentElement,
            fullWidth = parent.clientWidth,
            fullHeight = parent.clientHeight,
            width = bounds.width,
            height = bounds.height,
            midX = bounds.x + width / 2,
            midY = bounds.y + height / 2;

        if (width === 0 || height === 0) {
            return; // nothing to fit
        }

        svgScale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
        svgTranslate = [fullWidth / 2 - svgScale * midX, fullHeight / 2 - svgScale * midY];

        svg.attr('transform', 'translate(' + svgTranslate[0] + ', ' + svgTranslate[1] + ') scale(' + svgScale + ')');
        //        smoothTransform(svgTranslate, svgScale);
    }

    init(_selector, _options);

    return {
        appendRandomDataToNode: appendRandomDataToNode,
        neo4jDataToD3Data: neo4jDataToD3Data,
        randomD3Data: randomD3Data,
        size: size,
        updateWithD3Data: updateWithD3Data,
        updateWithNeo4jData: updateWithNeo4jData,
        version: version
    };
}

module.exports = Neo4jD3;

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi9pbmRleC5qcyIsInNyYy9tYWluL3NjcmlwdHMvbmVvNGpkMy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOztBQUVBLElBQUksVUFBVSxRQUFRLG1CQUFSLENBQWQ7O0FBRUEsT0FBTyxPQUFQLEdBQWlCLE9BQWpCOzs7QUNKQTtBQUNBO0FBQ0E7O0FBRUEsU0FBUyxPQUFULENBQWlCLFNBQWpCLEVBQTRCLFFBQTVCLEVBQXNDO0FBQ2xDLFFBQUksU0FBSjtBQUFBLFFBQWUsS0FBZjtBQUFBLFFBQXNCLElBQXRCO0FBQUEsUUFBNEIsSUFBNUI7QUFBQSxRQUFrQyxLQUFsQztBQUFBLFFBQXlDLFlBQXpDO0FBQUEsUUFBdUQsbUJBQXZEO0FBQUEsUUFBNEUsbUJBQTVFO0FBQUEsUUFBaUcsZ0JBQWpHO0FBQUEsUUFBbUgsYUFBbkg7QUFBQSxRQUFrSSxRQUFsSTtBQUFBLFFBQTRJLFVBQTVJO0FBQUEsUUFBd0osR0FBeEo7QUFBQSxRQUE2SixRQUE3SjtBQUFBLFFBQXVLLGdCQUF2SztBQUFBLFFBQXlMLFFBQXpMO0FBQUEsUUFBbU0sWUFBbk07QUFBQSxRQUNJLGlCQUFpQixFQURyQjtBQUFBLFFBRUksYUFBYSxLQUZqQjtBQUFBLFFBR0ksYUFBYSxDQUhqQjtBQUFBLFFBSUksVUFBVTtBQUNOLG1CQUFXLENBREw7QUFFTixnQkFBUSxRQUZGO0FBR04sbUJBQVcsU0FITDtBQUlOLGlCQUFTLGtCQUpIO0FBS04sZUFBTyxTQUxEO0FBTU4sa0JBQVUsRUFOSjtBQU9OLGdCQUFRLFNBUEY7QUFRTixtQkFBVyxJQVJMO0FBU04sc0JBQWMsU0FUUjtBQVVOLG1CQUFXLFNBVkw7QUFXTixzQkFBYyxTQVhSO0FBWU4sOEJBQXNCLFNBWmhCO0FBYU4sb0JBQVksRUFiTjtBQWNOLDJCQUFtQixTQWRiO0FBZU4saUJBQVM7QUFmSCxLQUpkO0FBQUEsUUFxQkks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Q0FBYixDQUF4QyxHQUEwRCxVQUExRCxHQUF1RSxRQUF2RSxHQUFrRixHQUF4RztBQUNSO0FBQ0s7O0FBRUQsU0FBSyxTQUFMLEVBQWdCLFFBQWhCOztBQUVBLFdBQU87QUFDSCxnQ0FBd0Isc0JBRHJCO0FBRUgsMkJBQW1CLGlCQUZoQjtBQUdILHNCQUFjLFlBSFg7QUFJSCxjQUFNLElBSkg7QUFLSCwwQkFBa0IsZ0JBTGY7QUFNSCw2QkFBcUIsbUJBTmxCO0FBT0gsaUJBQVM7QUFQTixLQUFQO0FBU0g7O0FBRUQsT0FBTyxPQUFQLEdBQWlCLE9BQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgbmVvNGpkMyA9IHJlcXVpcmUoJy4vc2NyaXB0cy9uZW80amQzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gbmVvNGpkMztcbiIsIi8qIGdsb2JhbCBkMywgZG9jdW1lbnQgKi9cclxuLyoganNoaW50IGxhdGVkZWY6bm9mdW5jICovXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbmZ1bmN0aW9uIE5lbzRqRDMoX3NlbGVjdG9yLCBfb3B0aW9ucykge1xyXG4gICAgdmFyIGNvbnRhaW5lciwgZ3JhcGgsIGluZm8sIG5vZGUsIG5vZGVzLCByZWxhdGlvbnNoaXAsIHJlbGF0aW9uc2hpcE91dGxpbmUsIHJlbGF0aW9uc2hpcE92ZXJsYXksIHJlbGF0aW9uc2hpcFRleHQsIHJlbGF0aW9uc2hpcHMsIHNlbGVjdG9yLCBzaW11bGF0aW9uLCBzdmcsIHN2Z05vZGVzLCBzdmdSZWxhdGlvbnNoaXBzLCBzdmdTY2FsZSwgc3ZnVHJhbnNsYXRlLFxyXG4gICAgICAgIGNsYXNzZXMyY29sb3JzID0ge30sXHJcbiAgICAgICAganVzdExvYWRlZCA9IGZhbHNlLFxyXG4gICAgICAgIG51bUNsYXNzZXMgPSAwLFxyXG4gICAgICAgIG9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIGFycm93U2l6ZTogNCxcclxuICAgICAgICAgICAgY29sb3JzOiBjb2xvcnMoKSxcclxuICAgICAgICAgICAgaGlnaGxpZ2h0OiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIGljb25NYXA6IGZvbnRBd2Vzb21lSWNvbnMoKSxcclxuICAgICAgICAgICAgaWNvbnM6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgaW1hZ2VNYXA6IHt9LFxyXG4gICAgICAgICAgICBpbWFnZXM6IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgaW5mb1BhbmVsOiB0cnVlLFxyXG4gICAgICAgICAgICBtaW5Db2xsaXNpb246IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgbmVvNGpEYXRhOiB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgIG5lbzRqRGF0YVVybDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBub2RlT3V0bGluZUZpbGxDb2xvcjogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBub2RlUmFkaXVzOiAyNSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwQ29sb3I6ICcjYTVhYmI2JyxcclxuICAgICAgICAgICAgem9vbUZpdDogZmFsc2VcclxuICAgICAgICB9LFxyXG4gICAgICAgIFZFUlNJT04gPSAnMC4wLjEnO1xyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZEdyYXBoKGNvbnRhaW5lcikge1xyXG4gICAgICAgIHN2ZyA9IGNvbnRhaW5lci5hcHBlbmQoJ3N2ZycpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLCAnMTAwJScpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ25lbzRqZDMtZ3JhcGgnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgIC5jYWxsKGQzLnpvb20oKS5vbignem9vbScsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSBkMy5ldmVudC50cmFuc2Zvcm0uayxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZSA9IFtkMy5ldmVudC50cmFuc2Zvcm0ueCwgZDMuZXZlbnQudHJhbnNmb3JtLnldO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN2Z1RyYW5zbGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNsYXRlWzBdICs9IHN2Z1RyYW5zbGF0ZVswXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zbGF0ZVsxXSArPSBzdmdUcmFuc2xhdGVbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdmdTY2FsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGUgKj0gc3ZnU2NhbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHN2Zy5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0cmFuc2xhdGVbMF0gKyAnLCAnICsgdHJhbnNsYXRlWzFdICsgJykgc2NhbGUoJyArIHNjYWxlICsgJyknKTtcclxuICAgICAgICAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgICAgICAgICAub24oJ2RibGNsaWNrLnpvb20nLCBudWxsKVxyXG4gICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcclxuICAgICAgICAgICAgICAgICAgICAgICAuYXR0cignaGVpZ2h0JywgJzEwMCUnKTtcclxuXHJcbiAgICAgICAgc3ZnUmVsYXRpb25zaGlwcyA9IHN2Zy5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCAncmVsYXRpb25zaGlwcycpO1xyXG5cclxuICAgICAgICBzdmdOb2RlcyA9IHN2Zy5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ25vZGVzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW1hZ2VUb05vZGUobm9kZSkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmFwcGVuZCgnaW1hZ2UnKVxyXG4gICAgICAgICAgICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaWNvbihkKSA/ICcyNHB4JzogJzMwcHgnO1xyXG4gICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgIC5hdHRyKCd4JywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gJzVweCc6ICctMTVweCc7XHJcbiAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgLmF0dHIoJ3hsaW5rOmhyZWYnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGltYWdlKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgIC5hdHRyKCd5JywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gJzVweCc6ICctMTZweCc7XHJcbiAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBpY29uKGQpID8gJzI0cHgnOiAnMzBweCc7XHJcbiAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvUGFuZWwoY29udGFpbmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvbnRhaW5lci5hcHBlbmQoJ2RpdicpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICduZW80amQzLWluZm8nKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudChjbHMsIGlzTm9kZSwgcHJvcGVydHksIHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIGVsZW0gPSBpbmZvLmFwcGVuZCgnYScpO1xyXG5cclxuICAgICAgICBlbGVtLmF0dHIoJ2hyZWYnLCAnIycpXHJcbiAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsIGNscylcclxuICAgICAgICAgICAgLmh0bWwoJzxzdHJvbmc+JyArIHByb3BlcnR5ICsgJzwvc3Ryb25nPicgKyAodmFsdWUgPyAoJzogJyArIHZhbHVlKSA6ICcnKSk7XHJcblxyXG4gICAgICAgIGlmICghdmFsdWUpIHtcclxuICAgICAgICAgICAgZWxlbS5zdHlsZSgnYmFja2dyb3VuZC1jb2xvcicsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvciA/IG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgOiAoaXNOb2RlID8gY2xhc3MyY29sb3IocHJvcGVydHkpIDogZGVmYXVsdENvbG9yKCkpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zdHlsZSgnYm9yZGVyLWNvbG9yJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gY2xhc3MyZGFya2VuQ29sb3Iob3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvcikgOiAoaXNOb2RlID8gY2xhc3MyZGFya2VuQ29sb3IocHJvcGVydHkpIDogZGVmYXVsdERhcmtlbkNvbG9yKCkpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5zdHlsZSgnY29sb3InLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBjbGFzczJkYXJrZW5Db2xvcihvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yKSA6ICcjZmZmJztcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRJbmZvRWxlbWVudENsYXNzKGNscywgbm9kZSkge1xyXG4gICAgICAgIGFwcGVuZEluZm9FbGVtZW50KGNscywgdHJ1ZSwgbm9kZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnRQcm9wZXJ0eShjbHMsIHByb3BlcnR5LCB2YWx1ZSkge1xyXG4gICAgICAgIGFwcGVuZEluZm9FbGVtZW50KGNscywgZmFsc2UsIHByb3BlcnR5LCB2YWx1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kSW5mb0VsZW1lbnRSZWxhdGlvbnNoaXAoY2xzLCByZWxhdGlvbnNoaXApIHtcclxuICAgICAgICBhcHBlbmRJbmZvRWxlbWVudChjbHMsIGZhbHNlLCByZWxhdGlvbnNoaXApO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE5vZGUoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuZW50ZXIoKVxyXG4gICAgICAgICAgICAgICAgICAgLmFwcGVuZCgnZycpXHJcbiAgICAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhpZ2hsaWdodCwgaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyA9ICdub2RlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWwgPSBkLmxhYmVsc1swXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKGljb24oZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSAnIG5vZGUtaWNvbic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1hZ2UoZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyArPSAnIG5vZGUtaW1hZ2UnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuaGlnaGxpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBvcHRpb25zLmhpZ2hsaWdodC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGlnaGxpZ2h0ID0gb3B0aW9ucy5oaWdobGlnaHRbaV07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGQubGFiZWxzWzBdID09PSBoaWdobGlnaHQuY2xhc3MgJiYgZC5wcm9wZXJ0aWVzW2hpZ2hsaWdodC5wcm9wZXJ0eV0gPT09IGhpZ2hsaWdodC52YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgKz0gJyBub2RlLWhpZ2hsaWdodGVkJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNsYXNzZXM7XHJcbiAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgLm9uKCdjbGljaycsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICBkLmZ4ID0gZC5meSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vbk5vZGVDbGljayA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLm9uTm9kZUNsaWNrKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHN0aWNrTm9kZShkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZURvdWJsZUNsaWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMub25Ob2RlRG91YmxlQ2xpY2soZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgIC5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVJbmZvKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZU1vdXNlRW50ZXIgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vbk5vZGVNb3VzZUVudGVyKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJJbmZvKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZU1vdXNlTGVhdmUgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vbk5vZGVNb3VzZUxlYXZlKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAuY2FsbChkMy5kcmFnKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLm9uKCdzdGFydCcsIGRyYWdTdGFydGVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAub24oJ2RyYWcnLCBkcmFnZ2VkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAub24oJ2VuZCcsIGRyYWdFbmRlZCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE5vZGVUb0dyYXBoKCkge1xyXG4gICAgICAgIHZhciBuID0gYXBwZW5kTm9kZSgpO1xyXG5cclxuICAgICAgICBhcHBlbmRSaW5nVG9Ob2RlKG4pO1xyXG4gICAgICAgIGFwcGVuZE91dGxpbmVUb05vZGUobik7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuaWNvbnMpIHtcbiAgICAgICAgICAgIGFwcGVuZFRleHRUb05vZGUobik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5pbWFnZXMpIHtcbiAgICAgICAgICAgIGFwcGVuZEltYWdlVG9Ob2RlKG4pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG47XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kT3V0bGluZVRvTm9kZShub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIG5vZGUuYXBwZW5kKCdjaXJjbGUnKVxyXG4gICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ291dGxpbmUnKVxyXG4gICAgICAgICAgICAgICAgICAgLmF0dHIoJ3InLCBvcHRpb25zLm5vZGVSYWRpdXMpXHJcbiAgICAgICAgICAgICAgICAgICAuc3R5bGUoJ2ZpbGwnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMubm9kZU91dGxpbmVGaWxsQ29sb3IgPyBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yIDogY2xhc3MyY29sb3IoZC5sYWJlbHNbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgIC5zdHlsZSgnc3Ryb2tlJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm5vZGVPdXRsaW5lRmlsbENvbG9yID8gY2xhc3MyZGFya2VuQ29sb3Iob3B0aW9ucy5ub2RlT3V0bGluZUZpbGxDb2xvcikgOiBjbGFzczJkYXJrZW5Db2xvcihkLmxhYmVsc1swXSk7XHJcbiAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgLmFwcGVuZCgndGl0bGUnKS50ZXh0KGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9TdHJpbmcoZCk7XHJcbiAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRSaW5nVG9Ob2RlKG5vZGUpIHtcclxuICAgICAgICByZXR1cm4gbm9kZS5hcHBlbmQoJ2NpcmNsZScpXHJcbiAgICAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCAncmluZycpXHJcbiAgICAgICAgICAgICAgICAgICAuYXR0cigncicsIG9wdGlvbnMubm9kZVJhZGl1cyAqIDEuMTYpXHJcbiAgICAgICAgICAgICAgICAgICAuYXBwZW5kKCd0aXRsZScpLnRleHQoZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0b1N0cmluZyhkKTtcclxuICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZFRleHRUb05vZGUobm9kZSkge1xyXG4gICAgICAgIHJldHVybiBub2RlLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICd0ZXh0JyArIChpY29uKGQpID8gJyBpY29uJyA6ICcnKTtcclxuICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAuYXR0cignZmlsbCcsICcjZmZmZmZmJylcclxuICAgICAgICAgICAgICAgICAgIC5hdHRyKCdmb250LXNpemUnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGljb24oZCkgPyAob3B0aW9ucy5ub2RlUmFkaXVzICsgJ3B4JykgOiAnMTBweCc7XHJcbiAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgLmF0dHIoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKVxyXG4gICAgICAgICAgICAgICAgICAgLmF0dHIoJ3RleHQtYW5jaG9yJywgJ21pZGRsZScpXHJcbiAgICAgICAgICAgICAgICAgICAuYXR0cigneScsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaWNvbihkKSA/IChwYXJzZUludChNYXRoLnJvdW5kKG9wdGlvbnMubm9kZVJhZGl1cyAqIDAuMzIpKSArICdweCcpIDogJzRweCc7XHJcbiAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgLmh0bWwoZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHZhciBfaWNvbiA9IGljb24oZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9pY29uID8gJyYjeCcgKyBfaWNvbiA6IGQuaWQ7XHJcbiAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRSYW5kb21EYXRhVG9Ob2RlKGQsIG1heE5vZGVzVG9HZW5lcmF0ZSkge1xyXG4gICAgICAgIHZhciBkYXRhID0gcmFuZG9tRDNEYXRhKGQsIG1heE5vZGVzVG9HZW5lcmF0ZSk7XHJcbiAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YShkYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRSZWxhdGlvbnNoaXAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlbGF0aW9uc2hpcC5lbnRlcigpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCAncmVsYXRpb25zaGlwJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5vblJlbGF0aW9uc2hpcERvdWJsZUNsaWNrID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vblJlbGF0aW9uc2hpcERvdWJsZUNsaWNrKGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5mbykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZUluZm8oZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFwcGVuZE91dGxpbmVUb1JlbGF0aW9uc2hpcChyKSB7XHJcbiAgICAgICAgcmV0dXJuIHIuYXBwZW5kKCdwYXRoJylcclxuICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdvdXRsaW5lJylcclxuICAgICAgICAgICAgICAgIC5hdHRyKCdmaWxsJywgJyNhNWFiYjYnKVxyXG4gICAgICAgICAgICAgICAgLmF0dHIoJ3N0cm9rZScsICdub25lJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXBwZW5kT3ZlcmxheVRvUmVsYXRpb25zaGlwKHIpIHtcclxuICAgICAgICByZXR1cm4gci5hcHBlbmQoJ3BhdGgnKVxyXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ292ZXJsYXknKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRUZXh0VG9SZWxhdGlvbnNoaXAocikge1xyXG4gICAgICAgIHJldHVybiByLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCAndGV4dCcpXHJcbiAgICAgICAgICAgICAgICAuYXR0cignZmlsbCcsICcjMDAwMDAwJylcclxuICAgICAgICAgICAgICAgIC5hdHRyKCdmb250LXNpemUnLCAnOHB4JylcclxuICAgICAgICAgICAgICAgIC5hdHRyKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcclxuICAgICAgICAgICAgICAgIC5hdHRyKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxyXG4gICAgICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkLnR5cGU7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhcHBlbmRSZWxhdGlvbnNoaXBUb0dyYXBoKCkge1xyXG4gICAgICAgIHZhciByZWxhdGlvbnNoaXAgPSBhcHBlbmRSZWxhdGlvbnNoaXAoKSxcclxuICAgICAgICAgICAgdGV4dCA9IGFwcGVuZFRleHRUb1JlbGF0aW9uc2hpcChyZWxhdGlvbnNoaXApLFxyXG4gICAgICAgICAgICBvdXRsaW5lID0gYXBwZW5kT3V0bGluZVRvUmVsYXRpb25zaGlwKHJlbGF0aW9uc2hpcCksXHJcbiAgICAgICAgICAgIG92ZXJsYXkgPSBhcHBlbmRPdmVybGF5VG9SZWxhdGlvbnNoaXAocmVsYXRpb25zaGlwKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgb3V0bGluZTogb3V0bGluZSxcclxuICAgICAgICAgICAgb3ZlcmxheTogb3ZlcmxheSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwOiByZWxhdGlvbnNoaXAsXHJcbiAgICAgICAgICAgIHRleHQ6IHRleHRcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNsYXNzMmNvbG9yKGNscykge1xyXG4gICAgICAgIHZhciBjb2xvciA9IGNsYXNzZXMyY29sb3JzW2Nsc107XHJcblxyXG4gICAgICAgIGlmICghY29sb3IpIHtcclxuLy8gICAgICAgICAgICBjb2xvciA9IG9wdGlvbnMuY29sb3JzW01hdGgubWluKG51bUNsYXNzZXMsIG9wdGlvbnMuY29sb3JzLmxlbmd0aCAtIDEpXTtcclxuICAgICAgICAgICAgY29sb3IgPSBvcHRpb25zLmNvbG9yc1tudW1DbGFzc2VzICUgb3B0aW9ucy5jb2xvcnMubGVuZ3RoXTtcclxuICAgICAgICAgICAgY2xhc3NlczJjb2xvcnNbY2xzXSA9IGNvbG9yO1xyXG4gICAgICAgICAgICBudW1DbGFzc2VzKys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gY29sb3I7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2xhc3MyZGFya2VuQ29sb3IoY2xzKSB7XHJcbiAgICAgICAgcmV0dXJuIGQzLnJnYihjbGFzczJjb2xvcihjbHMpKS5kYXJrZXIoMSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2xlYXJJbmZvKCkge1xyXG4gICAgICAgIGluZm8uaHRtbCgnJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29sb3IoKSB7XHJcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuY29sb3JzW29wdGlvbnMuY29sb3JzLmxlbmd0aCAqIE1hdGgucmFuZG9tKCkgPDwgMF07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29sb3JzKCkge1xyXG4gICAgICAgIC8vIGQzLnNjaGVtZUNhdGVnb3J5MTAsXHJcbiAgICAgICAgLy8gZDMuc2NoZW1lQ2F0ZWdvcnkyMCxcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAnIzY4YmRmNicsIC8vIGxpZ2h0IGJsdWVcclxuICAgICAgICAgICAgJyM2ZGNlOWUnLCAvLyBncmVlbiAjMVxyXG4gICAgICAgICAgICAnI2ZhYWZjMicsIC8vIGxpZ2h0IHBpbmtcclxuICAgICAgICAgICAgJyNmMmJhZjYnLCAvLyBwdXJwbGVcclxuICAgICAgICAgICAgJyNmZjkyOGMnLCAvLyBsaWdodCByZWRcclxuICAgICAgICAgICAgJyNmY2VhN2UnLCAvLyBsaWdodCB5ZWxsb3dcclxuICAgICAgICAgICAgJyNmZmM3NjYnLCAvLyBsaWdodCBvcmFuZ2VcclxuICAgICAgICAgICAgJyM0MDVmOWUnLCAvLyBuYXZ5IGJsdWVcclxuICAgICAgICAgICAgJyNhNWFiYjYnLCAvLyBkYXJrIGdyYXlcclxuICAgICAgICAgICAgJyM3OGNlY2InLCAvLyBncmVlbiAjMixcclxuICAgICAgICAgICAgJyNiODhjYmInLCAvLyBkYXJrIHB1cnBsZVxyXG4gICAgICAgICAgICAnI2NlZDJkOScsIC8vIGxpZ2h0IGdyYXlcclxuICAgICAgICAgICAgJyNlODQ2NDYnLCAvLyBkYXJrIHJlZFxyXG4gICAgICAgICAgICAnI2ZhNWY4NicsIC8vIGRhcmsgcGlua1xyXG4gICAgICAgICAgICAnI2ZmYWIxYScsIC8vIGRhcmsgb3JhbmdlXHJcbiAgICAgICAgICAgICcjZmNkYTE5JywgLy8gZGFyayB5ZWxsb3dcclxuICAgICAgICAgICAgJyM3OTdiODAnLCAvLyBibGFja1xyXG4gICAgICAgICAgICAnI2M5ZDk2ZicsIC8vIHBpc3RhY2NoaW9cclxuICAgICAgICAgICAgJyM0Nzk5MWYnLCAvLyBncmVlbiAjM1xyXG4gICAgICAgICAgICAnIzcwZWRlZScsIC8vIHR1cnF1b2lzZVxyXG4gICAgICAgICAgICAnI2ZmNzVlYScgIC8vIHBpbmtcclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNvbnRhaW5zKGFycmF5LCBpZCkge1xyXG4gICAgICAgIHZhciBmaWx0ZXIgPSBhcnJheS5maWx0ZXIoZnVuY3Rpb24oZWxlbSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZWxlbS5pZCA9PT0gaWQ7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBmaWx0ZXIubGVuZ3RoID4gMDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWZhdWx0Q29sb3IoKSB7XHJcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMucmVsYXRpb25zaGlwQ29sb3I7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZGVmYXVsdERhcmtlbkNvbG9yKCkge1xyXG4gICAgICAgIHJldHVybiBkMy5yZ2Iob3B0aW9ucy5jb2xvcnNbb3B0aW9ucy5jb2xvcnMubGVuZ3RoIC0gMV0pLmRhcmtlcigxKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmFnRW5kZWQoZCkge1xyXG4gICAgICAgIGlmICghZDMuZXZlbnQuYWN0aXZlKSB7XHJcbiAgICAgICAgICAgIHNpbXVsYXRpb24uYWxwaGFUYXJnZXQoMCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMub25Ob2RlRHJhZ0VuZCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBvcHRpb25zLm9uTm9kZURyYWdFbmQoZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRyYWdnZWQoZCkge1xyXG4gICAgICAgIHN0aWNrTm9kZShkKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmFnU3RhcnRlZChkKSB7XHJcbiAgICAgICAgaWYgKCFkMy5ldmVudC5hY3RpdmUpIHtcclxuICAgICAgICAgICAgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwLjMpLnJlc3RhcnQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGQuZnggPSBkLng7XHJcbiAgICAgICAgZC5meSA9IGQueTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm9uTm9kZURyYWdTdGFydCA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBvcHRpb25zLm9uTm9kZURyYWdTdGFydChkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZXh0ZW5kKG9iajEsIG9iajIpIHtcclxuICAgICAgICB2YXIgb2JqID0ge307XHJcblxyXG4gICAgICAgIG1lcmdlKG9iaiwgb2JqMSk7XHJcbiAgICAgICAgbWVyZ2Uob2JqLCBvYmoyKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmb250QXdlc29tZUljb25zKCkge1xyXG4gICAgICAgIHJldHVybiB7J2dsYXNzJzonZjAwMCcsJ211c2ljJzonZjAwMScsJ3NlYXJjaCc6J2YwMDInLCdlbnZlbG9wZS1vJzonZjAwMycsJ2hlYXJ0JzonZjAwNCcsJ3N0YXInOidmMDA1Jywnc3Rhci1vJzonZjAwNicsJ3VzZXInOidmMDA3JywnZmlsbSc6J2YwMDgnLCd0aC1sYXJnZSc6J2YwMDknLCd0aCc6J2YwMGEnLCd0aC1saXN0JzonZjAwYicsJ2NoZWNrJzonZjAwYycsJ3JlbW92ZSxjbG9zZSx0aW1lcyc6J2YwMGQnLCdzZWFyY2gtcGx1cyc6J2YwMGUnLCdzZWFyY2gtbWludXMnOidmMDEwJywncG93ZXItb2ZmJzonZjAxMScsJ3NpZ25hbCc6J2YwMTInLCdnZWFyLGNvZyc6J2YwMTMnLCd0cmFzaC1vJzonZjAxNCcsJ2hvbWUnOidmMDE1JywnZmlsZS1vJzonZjAxNicsJ2Nsb2NrLW8nOidmMDE3Jywncm9hZCc6J2YwMTgnLCdkb3dubG9hZCc6J2YwMTknLCdhcnJvdy1jaXJjbGUtby1kb3duJzonZjAxYScsJ2Fycm93LWNpcmNsZS1vLXVwJzonZjAxYicsJ2luYm94JzonZjAxYycsJ3BsYXktY2lyY2xlLW8nOidmMDFkJywncm90YXRlLXJpZ2h0LHJlcGVhdCc6J2YwMWUnLCdyZWZyZXNoJzonZjAyMScsJ2xpc3QtYWx0JzonZjAyMicsJ2xvY2snOidmMDIzJywnZmxhZyc6J2YwMjQnLCdoZWFkcGhvbmVzJzonZjAyNScsJ3ZvbHVtZS1vZmYnOidmMDI2Jywndm9sdW1lLWRvd24nOidmMDI3Jywndm9sdW1lLXVwJzonZjAyOCcsJ3FyY29kZSc6J2YwMjknLCdiYXJjb2RlJzonZjAyYScsJ3RhZyc6J2YwMmInLCd0YWdzJzonZjAyYycsJ2Jvb2snOidmMDJkJywnYm9va21hcmsnOidmMDJlJywncHJpbnQnOidmMDJmJywnY2FtZXJhJzonZjAzMCcsJ2ZvbnQnOidmMDMxJywnYm9sZCc6J2YwMzInLCdpdGFsaWMnOidmMDMzJywndGV4dC1oZWlnaHQnOidmMDM0JywndGV4dC13aWR0aCc6J2YwMzUnLCdhbGlnbi1sZWZ0JzonZjAzNicsJ2FsaWduLWNlbnRlcic6J2YwMzcnLCdhbGlnbi1yaWdodCc6J2YwMzgnLCdhbGlnbi1qdXN0aWZ5JzonZjAzOScsJ2xpc3QnOidmMDNhJywnZGVkZW50LG91dGRlbnQnOidmMDNiJywnaW5kZW50JzonZjAzYycsJ3ZpZGVvLWNhbWVyYSc6J2YwM2QnLCdwaG90byxpbWFnZSxwaWN0dXJlLW8nOidmMDNlJywncGVuY2lsJzonZjA0MCcsJ21hcC1tYXJrZXInOidmMDQxJywnYWRqdXN0JzonZjA0MicsJ3RpbnQnOidmMDQzJywnZWRpdCxwZW5jaWwtc3F1YXJlLW8nOidmMDQ0Jywnc2hhcmUtc3F1YXJlLW8nOidmMDQ1JywnY2hlY2stc3F1YXJlLW8nOidmMDQ2JywnYXJyb3dzJzonZjA0NycsJ3N0ZXAtYmFja3dhcmQnOidmMDQ4JywnZmFzdC1iYWNrd2FyZCc6J2YwNDknLCdiYWNrd2FyZCc6J2YwNGEnLCdwbGF5JzonZjA0YicsJ3BhdXNlJzonZjA0YycsJ3N0b3AnOidmMDRkJywnZm9yd2FyZCc6J2YwNGUnLCdmYXN0LWZvcndhcmQnOidmMDUwJywnc3RlcC1mb3J3YXJkJzonZjA1MScsJ2VqZWN0JzonZjA1MicsJ2NoZXZyb24tbGVmdCc6J2YwNTMnLCdjaGV2cm9uLXJpZ2h0JzonZjA1NCcsJ3BsdXMtY2lyY2xlJzonZjA1NScsJ21pbnVzLWNpcmNsZSc6J2YwNTYnLCd0aW1lcy1jaXJjbGUnOidmMDU3JywnY2hlY2stY2lyY2xlJzonZjA1OCcsJ3F1ZXN0aW9uLWNpcmNsZSc6J2YwNTknLCdpbmZvLWNpcmNsZSc6J2YwNWEnLCdjcm9zc2hhaXJzJzonZjA1YicsJ3RpbWVzLWNpcmNsZS1vJzonZjA1YycsJ2NoZWNrLWNpcmNsZS1vJzonZjA1ZCcsJ2Jhbic6J2YwNWUnLCdhcnJvdy1sZWZ0JzonZjA2MCcsJ2Fycm93LXJpZ2h0JzonZjA2MScsJ2Fycm93LXVwJzonZjA2MicsJ2Fycm93LWRvd24nOidmMDYzJywnbWFpbC1mb3J3YXJkLHNoYXJlJzonZjA2NCcsJ2V4cGFuZCc6J2YwNjUnLCdjb21wcmVzcyc6J2YwNjYnLCdwbHVzJzonZjA2NycsJ21pbnVzJzonZjA2OCcsJ2FzdGVyaXNrJzonZjA2OScsJ2V4Y2xhbWF0aW9uLWNpcmNsZSc6J2YwNmEnLCdnaWZ0JzonZjA2YicsJ2xlYWYnOidmMDZjJywnZmlyZSc6J2YwNmQnLCdleWUnOidmMDZlJywnZXllLXNsYXNoJzonZjA3MCcsJ3dhcm5pbmcsZXhjbGFtYXRpb24tdHJpYW5nbGUnOidmMDcxJywncGxhbmUnOidmMDcyJywnY2FsZW5kYXInOidmMDczJywncmFuZG9tJzonZjA3NCcsJ2NvbW1lbnQnOidmMDc1JywnbWFnbmV0JzonZjA3NicsJ2NoZXZyb24tdXAnOidmMDc3JywnY2hldnJvbi1kb3duJzonZjA3OCcsJ3JldHdlZXQnOidmMDc5Jywnc2hvcHBpbmctY2FydCc6J2YwN2EnLCdmb2xkZXInOidmMDdiJywnZm9sZGVyLW9wZW4nOidmMDdjJywnYXJyb3dzLXYnOidmMDdkJywnYXJyb3dzLWgnOidmMDdlJywnYmFyLWNoYXJ0LW8sYmFyLWNoYXJ0JzonZjA4MCcsJ3R3aXR0ZXItc3F1YXJlJzonZjA4MScsJ2ZhY2Vib29rLXNxdWFyZSc6J2YwODInLCdjYW1lcmEtcmV0cm8nOidmMDgzJywna2V5JzonZjA4NCcsJ2dlYXJzLGNvZ3MnOidmMDg1JywnY29tbWVudHMnOidmMDg2JywndGh1bWJzLW8tdXAnOidmMDg3JywndGh1bWJzLW8tZG93bic6J2YwODgnLCdzdGFyLWhhbGYnOidmMDg5JywnaGVhcnQtbyc6J2YwOGEnLCdzaWduLW91dCc6J2YwOGInLCdsaW5rZWRpbi1zcXVhcmUnOidmMDhjJywndGh1bWItdGFjayc6J2YwOGQnLCdleHRlcm5hbC1saW5rJzonZjA4ZScsJ3NpZ24taW4nOidmMDkwJywndHJvcGh5JzonZjA5MScsJ2dpdGh1Yi1zcXVhcmUnOidmMDkyJywndXBsb2FkJzonZjA5MycsJ2xlbW9uLW8nOidmMDk0JywncGhvbmUnOidmMDk1Jywnc3F1YXJlLW8nOidmMDk2JywnYm9va21hcmstbyc6J2YwOTcnLCdwaG9uZS1zcXVhcmUnOidmMDk4JywndHdpdHRlcic6J2YwOTknLCdmYWNlYm9vay1mLGZhY2Vib29rJzonZjA5YScsJ2dpdGh1Yic6J2YwOWInLCd1bmxvY2snOidmMDljJywnY3JlZGl0LWNhcmQnOidmMDlkJywnZmVlZCxyc3MnOidmMDllJywnaGRkLW8nOidmMGEwJywnYnVsbGhvcm4nOidmMGExJywnYmVsbCc6J2YwZjMnLCdjZXJ0aWZpY2F0ZSc6J2YwYTMnLCdoYW5kLW8tcmlnaHQnOidmMGE0JywnaGFuZC1vLWxlZnQnOidmMGE1JywnaGFuZC1vLXVwJzonZjBhNicsJ2hhbmQtby1kb3duJzonZjBhNycsJ2Fycm93LWNpcmNsZS1sZWZ0JzonZjBhOCcsJ2Fycm93LWNpcmNsZS1yaWdodCc6J2YwYTknLCdhcnJvdy1jaXJjbGUtdXAnOidmMGFhJywnYXJyb3ctY2lyY2xlLWRvd24nOidmMGFiJywnZ2xvYmUnOidmMGFjJywnd3JlbmNoJzonZjBhZCcsJ3Rhc2tzJzonZjBhZScsJ2ZpbHRlcic6J2YwYjAnLCdicmllZmNhc2UnOidmMGIxJywnYXJyb3dzLWFsdCc6J2YwYjInLCdncm91cCx1c2Vycyc6J2YwYzAnLCdjaGFpbixsaW5rJzonZjBjMScsJ2Nsb3VkJzonZjBjMicsJ2ZsYXNrJzonZjBjMycsJ2N1dCxzY2lzc29ycyc6J2YwYzQnLCdjb3B5LGZpbGVzLW8nOidmMGM1JywncGFwZXJjbGlwJzonZjBjNicsJ3NhdmUsZmxvcHB5LW8nOidmMGM3Jywnc3F1YXJlJzonZjBjOCcsJ25hdmljb24scmVvcmRlcixiYXJzJzonZjBjOScsJ2xpc3QtdWwnOidmMGNhJywnbGlzdC1vbCc6J2YwY2InLCdzdHJpa2V0aHJvdWdoJzonZjBjYycsJ3VuZGVybGluZSc6J2YwY2QnLCd0YWJsZSc6J2YwY2UnLCdtYWdpYyc6J2YwZDAnLCd0cnVjayc6J2YwZDEnLCdwaW50ZXJlc3QnOidmMGQyJywncGludGVyZXN0LXNxdWFyZSc6J2YwZDMnLCdnb29nbGUtcGx1cy1zcXVhcmUnOidmMGQ0JywnZ29vZ2xlLXBsdXMnOidmMGQ1JywnbW9uZXknOidmMGQ2JywnY2FyZXQtZG93bic6J2YwZDcnLCdjYXJldC11cCc6J2YwZDgnLCdjYXJldC1sZWZ0JzonZjBkOScsJ2NhcmV0LXJpZ2h0JzonZjBkYScsJ2NvbHVtbnMnOidmMGRiJywndW5zb3J0ZWQsc29ydCc6J2YwZGMnLCdzb3J0LWRvd24sc29ydC1kZXNjJzonZjBkZCcsJ3NvcnQtdXAsc29ydC1hc2MnOidmMGRlJywnZW52ZWxvcGUnOidmMGUwJywnbGlua2VkaW4nOidmMGUxJywncm90YXRlLWxlZnQsdW5kbyc6J2YwZTInLCdsZWdhbCxnYXZlbCc6J2YwZTMnLCdkYXNoYm9hcmQsdGFjaG9tZXRlcic6J2YwZTQnLCdjb21tZW50LW8nOidmMGU1JywnY29tbWVudHMtbyc6J2YwZTYnLCdmbGFzaCxib2x0JzonZjBlNycsJ3NpdGVtYXAnOidmMGU4JywndW1icmVsbGEnOidmMGU5JywncGFzdGUsY2xpcGJvYXJkJzonZjBlYScsJ2xpZ2h0YnVsYi1vJzonZjBlYicsJ2V4Y2hhbmdlJzonZjBlYycsJ2Nsb3VkLWRvd25sb2FkJzonZjBlZCcsJ2Nsb3VkLXVwbG9hZCc6J2YwZWUnLCd1c2VyLW1kJzonZjBmMCcsJ3N0ZXRob3Njb3BlJzonZjBmMScsJ3N1aXRjYXNlJzonZjBmMicsJ2JlbGwtbyc6J2YwYTInLCdjb2ZmZWUnOidmMGY0JywnY3V0bGVyeSc6J2YwZjUnLCdmaWxlLXRleHQtbyc6J2YwZjYnLCdidWlsZGluZy1vJzonZjBmNycsJ2hvc3BpdGFsLW8nOidmMGY4JywnYW1idWxhbmNlJzonZjBmOScsJ21lZGtpdCc6J2YwZmEnLCdmaWdodGVyLWpldCc6J2YwZmInLCdiZWVyJzonZjBmYycsJ2gtc3F1YXJlJzonZjBmZCcsJ3BsdXMtc3F1YXJlJzonZjBmZScsJ2FuZ2xlLWRvdWJsZS1sZWZ0JzonZjEwMCcsJ2FuZ2xlLWRvdWJsZS1yaWdodCc6J2YxMDEnLCdhbmdsZS1kb3VibGUtdXAnOidmMTAyJywnYW5nbGUtZG91YmxlLWRvd24nOidmMTAzJywnYW5nbGUtbGVmdCc6J2YxMDQnLCdhbmdsZS1yaWdodCc6J2YxMDUnLCdhbmdsZS11cCc6J2YxMDYnLCdhbmdsZS1kb3duJzonZjEwNycsJ2Rlc2t0b3AnOidmMTA4JywnbGFwdG9wJzonZjEwOScsJ3RhYmxldCc6J2YxMGEnLCdtb2JpbGUtcGhvbmUsbW9iaWxlJzonZjEwYicsJ2NpcmNsZS1vJzonZjEwYycsJ3F1b3RlLWxlZnQnOidmMTBkJywncXVvdGUtcmlnaHQnOidmMTBlJywnc3Bpbm5lcic6J2YxMTAnLCdjaXJjbGUnOidmMTExJywnbWFpbC1yZXBseSxyZXBseSc6J2YxMTInLCdnaXRodWItYWx0JzonZjExMycsJ2ZvbGRlci1vJzonZjExNCcsJ2ZvbGRlci1vcGVuLW8nOidmMTE1Jywnc21pbGUtbyc6J2YxMTgnLCdmcm93bi1vJzonZjExOScsJ21laC1vJzonZjExYScsJ2dhbWVwYWQnOidmMTFiJywna2V5Ym9hcmQtbyc6J2YxMWMnLCdmbGFnLW8nOidmMTFkJywnZmxhZy1jaGVja2VyZWQnOidmMTFlJywndGVybWluYWwnOidmMTIwJywnY29kZSc6J2YxMjEnLCdtYWlsLXJlcGx5LWFsbCxyZXBseS1hbGwnOidmMTIyJywnc3Rhci1oYWxmLWVtcHR5LHN0YXItaGFsZi1mdWxsLHN0YXItaGFsZi1vJzonZjEyMycsJ2xvY2F0aW9uLWFycm93JzonZjEyNCcsJ2Nyb3AnOidmMTI1JywnY29kZS1mb3JrJzonZjEyNicsJ3VubGluayxjaGFpbi1icm9rZW4nOidmMTI3JywncXVlc3Rpb24nOidmMTI4JywnaW5mbyc6J2YxMjknLCdleGNsYW1hdGlvbic6J2YxMmEnLCdzdXBlcnNjcmlwdCc6J2YxMmInLCdzdWJzY3JpcHQnOidmMTJjJywnZXJhc2VyJzonZjEyZCcsJ3B1enpsZS1waWVjZSc6J2YxMmUnLCdtaWNyb3Bob25lJzonZjEzMCcsJ21pY3JvcGhvbmUtc2xhc2gnOidmMTMxJywnc2hpZWxkJzonZjEzMicsJ2NhbGVuZGFyLW8nOidmMTMzJywnZmlyZS1leHRpbmd1aXNoZXInOidmMTM0Jywncm9ja2V0JzonZjEzNScsJ21heGNkbic6J2YxMzYnLCdjaGV2cm9uLWNpcmNsZS1sZWZ0JzonZjEzNycsJ2NoZXZyb24tY2lyY2xlLXJpZ2h0JzonZjEzOCcsJ2NoZXZyb24tY2lyY2xlLXVwJzonZjEzOScsJ2NoZXZyb24tY2lyY2xlLWRvd24nOidmMTNhJywnaHRtbDUnOidmMTNiJywnY3NzMyc6J2YxM2MnLCdhbmNob3InOidmMTNkJywndW5sb2NrLWFsdCc6J2YxM2UnLCdidWxsc2V5ZSc6J2YxNDAnLCdlbGxpcHNpcy1oJzonZjE0MScsJ2VsbGlwc2lzLXYnOidmMTQyJywncnNzLXNxdWFyZSc6J2YxNDMnLCdwbGF5LWNpcmNsZSc6J2YxNDQnLCd0aWNrZXQnOidmMTQ1JywnbWludXMtc3F1YXJlJzonZjE0NicsJ21pbnVzLXNxdWFyZS1vJzonZjE0NycsJ2xldmVsLXVwJzonZjE0OCcsJ2xldmVsLWRvd24nOidmMTQ5JywnY2hlY2stc3F1YXJlJzonZjE0YScsJ3BlbmNpbC1zcXVhcmUnOidmMTRiJywnZXh0ZXJuYWwtbGluay1zcXVhcmUnOidmMTRjJywnc2hhcmUtc3F1YXJlJzonZjE0ZCcsJ2NvbXBhc3MnOidmMTRlJywndG9nZ2xlLWRvd24sY2FyZXQtc3F1YXJlLW8tZG93bic6J2YxNTAnLCd0b2dnbGUtdXAsY2FyZXQtc3F1YXJlLW8tdXAnOidmMTUxJywndG9nZ2xlLXJpZ2h0LGNhcmV0LXNxdWFyZS1vLXJpZ2h0JzonZjE1MicsJ2V1cm8sZXVyJzonZjE1MycsJ2dicCc6J2YxNTQnLCdkb2xsYXIsdXNkJzonZjE1NScsJ3J1cGVlLGlucic6J2YxNTYnLCdjbnkscm1iLHllbixqcHknOidmMTU3JywncnVibGUscm91YmxlLHJ1Yic6J2YxNTgnLCd3b24sa3J3JzonZjE1OScsJ2JpdGNvaW4sYnRjJzonZjE1YScsJ2ZpbGUnOidmMTViJywnZmlsZS10ZXh0JzonZjE1YycsJ3NvcnQtYWxwaGEtYXNjJzonZjE1ZCcsJ3NvcnQtYWxwaGEtZGVzYyc6J2YxNWUnLCdzb3J0LWFtb3VudC1hc2MnOidmMTYwJywnc29ydC1hbW91bnQtZGVzYyc6J2YxNjEnLCdzb3J0LW51bWVyaWMtYXNjJzonZjE2MicsJ3NvcnQtbnVtZXJpYy1kZXNjJzonZjE2MycsJ3RodW1icy11cCc6J2YxNjQnLCd0aHVtYnMtZG93bic6J2YxNjUnLCd5b3V0dWJlLXNxdWFyZSc6J2YxNjYnLCd5b3V0dWJlJzonZjE2NycsJ3hpbmcnOidmMTY4JywneGluZy1zcXVhcmUnOidmMTY5JywneW91dHViZS1wbGF5JzonZjE2YScsJ2Ryb3Bib3gnOidmMTZiJywnc3RhY2stb3ZlcmZsb3cnOidmMTZjJywnaW5zdGFncmFtJzonZjE2ZCcsJ2ZsaWNrcic6J2YxNmUnLCdhZG4nOidmMTcwJywnYml0YnVja2V0JzonZjE3MScsJ2JpdGJ1Y2tldC1zcXVhcmUnOidmMTcyJywndHVtYmxyJzonZjE3MycsJ3R1bWJsci1zcXVhcmUnOidmMTc0JywnbG9uZy1hcnJvdy1kb3duJzonZjE3NScsJ2xvbmctYXJyb3ctdXAnOidmMTc2JywnbG9uZy1hcnJvdy1sZWZ0JzonZjE3NycsJ2xvbmctYXJyb3ctcmlnaHQnOidmMTc4JywnYXBwbGUnOidmMTc5Jywnd2luZG93cyc6J2YxN2EnLCdhbmRyb2lkJzonZjE3YicsJ2xpbnV4JzonZjE3YycsJ2RyaWJiYmxlJzonZjE3ZCcsJ3NreXBlJzonZjE3ZScsJ2ZvdXJzcXVhcmUnOidmMTgwJywndHJlbGxvJzonZjE4MScsJ2ZlbWFsZSc6J2YxODInLCdtYWxlJzonZjE4MycsJ2dpdHRpcCxncmF0aXBheSc6J2YxODQnLCdzdW4tbyc6J2YxODUnLCdtb29uLW8nOidmMTg2JywnYXJjaGl2ZSc6J2YxODcnLCdidWcnOidmMTg4JywndmsnOidmMTg5Jywnd2VpYm8nOidmMThhJywncmVucmVuJzonZjE4YicsJ3BhZ2VsaW5lcyc6J2YxOGMnLCdzdGFjay1leGNoYW5nZSc6J2YxOGQnLCdhcnJvdy1jaXJjbGUtby1yaWdodCc6J2YxOGUnLCdhcnJvdy1jaXJjbGUtby1sZWZ0JzonZjE5MCcsJ3RvZ2dsZS1sZWZ0LGNhcmV0LXNxdWFyZS1vLWxlZnQnOidmMTkxJywnZG90LWNpcmNsZS1vJzonZjE5MicsJ3doZWVsY2hhaXInOidmMTkzJywndmltZW8tc3F1YXJlJzonZjE5NCcsJ3R1cmtpc2gtbGlyYSx0cnknOidmMTk1JywncGx1cy1zcXVhcmUtbyc6J2YxOTYnLCdzcGFjZS1zaHV0dGxlJzonZjE5NycsJ3NsYWNrJzonZjE5OCcsJ2VudmVsb3BlLXNxdWFyZSc6J2YxOTknLCd3b3JkcHJlc3MnOidmMTlhJywnb3BlbmlkJzonZjE5YicsJ2luc3RpdHV0aW9uLGJhbmssdW5pdmVyc2l0eSc6J2YxOWMnLCdtb3J0YXItYm9hcmQsZ3JhZHVhdGlvbi1jYXAnOidmMTlkJywneWFob28nOidmMTllJywnZ29vZ2xlJzonZjFhMCcsJ3JlZGRpdCc6J2YxYTEnLCdyZWRkaXQtc3F1YXJlJzonZjFhMicsJ3N0dW1ibGV1cG9uLWNpcmNsZSc6J2YxYTMnLCdzdHVtYmxldXBvbic6J2YxYTQnLCdkZWxpY2lvdXMnOidmMWE1JywnZGlnZyc6J2YxYTYnLCdwaWVkLXBpcGVyLXBwJzonZjFhNycsJ3BpZWQtcGlwZXItYWx0JzonZjFhOCcsJ2RydXBhbCc6J2YxYTknLCdqb29tbGEnOidmMWFhJywnbGFuZ3VhZ2UnOidmMWFiJywnZmF4JzonZjFhYycsJ2J1aWxkaW5nJzonZjFhZCcsJ2NoaWxkJzonZjFhZScsJ3Bhdyc6J2YxYjAnLCdzcG9vbic6J2YxYjEnLCdjdWJlJzonZjFiMicsJ2N1YmVzJzonZjFiMycsJ2JlaGFuY2UnOidmMWI0JywnYmVoYW5jZS1zcXVhcmUnOidmMWI1Jywnc3RlYW0nOidmMWI2Jywnc3RlYW0tc3F1YXJlJzonZjFiNycsJ3JlY3ljbGUnOidmMWI4JywnYXV0b21vYmlsZSxjYXInOidmMWI5JywnY2FiLHRheGknOidmMWJhJywndHJlZSc6J2YxYmInLCdzcG90aWZ5JzonZjFiYycsJ2RldmlhbnRhcnQnOidmMWJkJywnc291bmRjbG91ZCc6J2YxYmUnLCdkYXRhYmFzZSc6J2YxYzAnLCdmaWxlLXBkZi1vJzonZjFjMScsJ2ZpbGUtd29yZC1vJzonZjFjMicsJ2ZpbGUtZXhjZWwtbyc6J2YxYzMnLCdmaWxlLXBvd2VycG9pbnQtbyc6J2YxYzQnLCdmaWxlLXBob3RvLW8sZmlsZS1waWN0dXJlLW8sZmlsZS1pbWFnZS1vJzonZjFjNScsJ2ZpbGUtemlwLW8sZmlsZS1hcmNoaXZlLW8nOidmMWM2JywnZmlsZS1zb3VuZC1vLGZpbGUtYXVkaW8tbyc6J2YxYzcnLCdmaWxlLW1vdmllLW8sZmlsZS12aWRlby1vJzonZjFjOCcsJ2ZpbGUtY29kZS1vJzonZjFjOScsJ3ZpbmUnOidmMWNhJywnY29kZXBlbic6J2YxY2InLCdqc2ZpZGRsZSc6J2YxY2MnLCdsaWZlLWJvdXksbGlmZS1idW95LGxpZmUtc2F2ZXIsc3VwcG9ydCxsaWZlLXJpbmcnOidmMWNkJywnY2lyY2xlLW8tbm90Y2gnOidmMWNlJywncmEscmVzaXN0YW5jZSxyZWJlbCc6J2YxZDAnLCdnZSxlbXBpcmUnOidmMWQxJywnZ2l0LXNxdWFyZSc6J2YxZDInLCdnaXQnOidmMWQzJywneS1jb21iaW5hdG9yLXNxdWFyZSx5Yy1zcXVhcmUsaGFja2VyLW5ld3MnOidmMWQ0JywndGVuY2VudC13ZWlibyc6J2YxZDUnLCdxcSc6J2YxZDYnLCd3ZWNoYXQsd2VpeGluJzonZjFkNycsJ3NlbmQscGFwZXItcGxhbmUnOidmMWQ4Jywnc2VuZC1vLHBhcGVyLXBsYW5lLW8nOidmMWQ5JywnaGlzdG9yeSc6J2YxZGEnLCdjaXJjbGUtdGhpbic6J2YxZGInLCdoZWFkZXInOidmMWRjJywncGFyYWdyYXBoJzonZjFkZCcsJ3NsaWRlcnMnOidmMWRlJywnc2hhcmUtYWx0JzonZjFlMCcsJ3NoYXJlLWFsdC1zcXVhcmUnOidmMWUxJywnYm9tYic6J2YxZTInLCdzb2NjZXItYmFsbC1vLGZ1dGJvbC1vJzonZjFlMycsJ3R0eSc6J2YxZTQnLCdiaW5vY3VsYXJzJzonZjFlNScsJ3BsdWcnOidmMWU2Jywnc2xpZGVzaGFyZSc6J2YxZTcnLCd0d2l0Y2gnOidmMWU4JywneWVscCc6J2YxZTknLCduZXdzcGFwZXItbyc6J2YxZWEnLCd3aWZpJzonZjFlYicsJ2NhbGN1bGF0b3InOidmMWVjJywncGF5cGFsJzonZjFlZCcsJ2dvb2dsZS13YWxsZXQnOidmMWVlJywnY2MtdmlzYSc6J2YxZjAnLCdjYy1tYXN0ZXJjYXJkJzonZjFmMScsJ2NjLWRpc2NvdmVyJzonZjFmMicsJ2NjLWFtZXgnOidmMWYzJywnY2MtcGF5cGFsJzonZjFmNCcsJ2NjLXN0cmlwZSc6J2YxZjUnLCdiZWxsLXNsYXNoJzonZjFmNicsJ2JlbGwtc2xhc2gtbyc6J2YxZjcnLCd0cmFzaCc6J2YxZjgnLCdjb3B5cmlnaHQnOidmMWY5JywnYXQnOidmMWZhJywnZXllZHJvcHBlcic6J2YxZmInLCdwYWludC1icnVzaCc6J2YxZmMnLCdiaXJ0aGRheS1jYWtlJzonZjFmZCcsJ2FyZWEtY2hhcnQnOidmMWZlJywncGllLWNoYXJ0JzonZjIwMCcsJ2xpbmUtY2hhcnQnOidmMjAxJywnbGFzdGZtJzonZjIwMicsJ2xhc3RmbS1zcXVhcmUnOidmMjAzJywndG9nZ2xlLW9mZic6J2YyMDQnLCd0b2dnbGUtb24nOidmMjA1JywnYmljeWNsZSc6J2YyMDYnLCdidXMnOidmMjA3JywnaW94aG9zdCc6J2YyMDgnLCdhbmdlbGxpc3QnOidmMjA5JywnY2MnOidmMjBhJywnc2hla2VsLHNoZXFlbCxpbHMnOidmMjBiJywnbWVhbnBhdGgnOidmMjBjJywnYnV5c2VsbGFkcyc6J2YyMGQnLCdjb25uZWN0ZGV2ZWxvcCc6J2YyMGUnLCdkYXNoY3ViZSc6J2YyMTAnLCdmb3J1bWJlZSc6J2YyMTEnLCdsZWFucHViJzonZjIxMicsJ3NlbGxzeSc6J2YyMTMnLCdzaGlydHNpbmJ1bGsnOidmMjE0Jywnc2ltcGx5YnVpbHQnOidmMjE1Jywnc2t5YXRsYXMnOidmMjE2JywnY2FydC1wbHVzJzonZjIxNycsJ2NhcnQtYXJyb3ctZG93bic6J2YyMTgnLCdkaWFtb25kJzonZjIxOScsJ3NoaXAnOidmMjFhJywndXNlci1zZWNyZXQnOidmMjFiJywnbW90b3JjeWNsZSc6J2YyMWMnLCdzdHJlZXQtdmlldyc6J2YyMWQnLCdoZWFydGJlYXQnOidmMjFlJywndmVudXMnOidmMjIxJywnbWFycyc6J2YyMjInLCdtZXJjdXJ5JzonZjIyMycsJ2ludGVyc2V4LHRyYW5zZ2VuZGVyJzonZjIyNCcsJ3RyYW5zZ2VuZGVyLWFsdCc6J2YyMjUnLCd2ZW51cy1kb3VibGUnOidmMjI2JywnbWFycy1kb3VibGUnOidmMjI3JywndmVudXMtbWFycyc6J2YyMjgnLCdtYXJzLXN0cm9rZSc6J2YyMjknLCdtYXJzLXN0cm9rZS12JzonZjIyYScsJ21hcnMtc3Ryb2tlLWgnOidmMjJiJywnbmV1dGVyJzonZjIyYycsJ2dlbmRlcmxlc3MnOidmMjJkJywnZmFjZWJvb2stb2ZmaWNpYWwnOidmMjMwJywncGludGVyZXN0LXAnOidmMjMxJywnd2hhdHNhcHAnOidmMjMyJywnc2VydmVyJzonZjIzMycsJ3VzZXItcGx1cyc6J2YyMzQnLCd1c2VyLXRpbWVzJzonZjIzNScsJ2hvdGVsLGJlZCc6J2YyMzYnLCd2aWFjb2luJzonZjIzNycsJ3RyYWluJzonZjIzOCcsJ3N1YndheSc6J2YyMzknLCdtZWRpdW0nOidmMjNhJywneWMseS1jb21iaW5hdG9yJzonZjIzYicsJ29wdGluLW1vbnN0ZXInOidmMjNjJywnb3BlbmNhcnQnOidmMjNkJywnZXhwZWRpdGVkc3NsJzonZjIzZScsJ2JhdHRlcnktNCxiYXR0ZXJ5LWZ1bGwnOidmMjQwJywnYmF0dGVyeS0zLGJhdHRlcnktdGhyZWUtcXVhcnRlcnMnOidmMjQxJywnYmF0dGVyeS0yLGJhdHRlcnktaGFsZic6J2YyNDInLCdiYXR0ZXJ5LTEsYmF0dGVyeS1xdWFydGVyJzonZjI0MycsJ2JhdHRlcnktMCxiYXR0ZXJ5LWVtcHR5JzonZjI0NCcsJ21vdXNlLXBvaW50ZXInOidmMjQ1JywnaS1jdXJzb3InOidmMjQ2Jywnb2JqZWN0LWdyb3VwJzonZjI0NycsJ29iamVjdC11bmdyb3VwJzonZjI0OCcsJ3N0aWNreS1ub3RlJzonZjI0OScsJ3N0aWNreS1ub3RlLW8nOidmMjRhJywnY2MtamNiJzonZjI0YicsJ2NjLWRpbmVycy1jbHViJzonZjI0YycsJ2Nsb25lJzonZjI0ZCcsJ2JhbGFuY2Utc2NhbGUnOidmMjRlJywnaG91cmdsYXNzLW8nOidmMjUwJywnaG91cmdsYXNzLTEsaG91cmdsYXNzLXN0YXJ0JzonZjI1MScsJ2hvdXJnbGFzcy0yLGhvdXJnbGFzcy1oYWxmJzonZjI1MicsJ2hvdXJnbGFzcy0zLGhvdXJnbGFzcy1lbmQnOidmMjUzJywnaG91cmdsYXNzJzonZjI1NCcsJ2hhbmQtZ3JhYi1vLGhhbmQtcm9jay1vJzonZjI1NScsJ2hhbmQtc3RvcC1vLGhhbmQtcGFwZXItbyc6J2YyNTYnLCdoYW5kLXNjaXNzb3JzLW8nOidmMjU3JywnaGFuZC1saXphcmQtbyc6J2YyNTgnLCdoYW5kLXNwb2NrLW8nOidmMjU5JywnaGFuZC1wb2ludGVyLW8nOidmMjVhJywnaGFuZC1wZWFjZS1vJzonZjI1YicsJ3RyYWRlbWFyayc6J2YyNWMnLCdyZWdpc3RlcmVkJzonZjI1ZCcsJ2NyZWF0aXZlLWNvbW1vbnMnOidmMjVlJywnZ2cnOidmMjYwJywnZ2ctY2lyY2xlJzonZjI2MScsJ3RyaXBhZHZpc29yJzonZjI2MicsJ29kbm9rbGFzc25pa2knOidmMjYzJywnb2Rub2tsYXNzbmlraS1zcXVhcmUnOidmMjY0JywnZ2V0LXBvY2tldCc6J2YyNjUnLCd3aWtpcGVkaWEtdyc6J2YyNjYnLCdzYWZhcmknOidmMjY3JywnY2hyb21lJzonZjI2OCcsJ2ZpcmVmb3gnOidmMjY5Jywnb3BlcmEnOidmMjZhJywnaW50ZXJuZXQtZXhwbG9yZXInOidmMjZiJywndHYsdGVsZXZpc2lvbic6J2YyNmMnLCdjb250YW8nOidmMjZkJywnNTAwcHgnOidmMjZlJywnYW1hem9uJzonZjI3MCcsJ2NhbGVuZGFyLXBsdXMtbyc6J2YyNzEnLCdjYWxlbmRhci1taW51cy1vJzonZjI3MicsJ2NhbGVuZGFyLXRpbWVzLW8nOidmMjczJywnY2FsZW5kYXItY2hlY2stbyc6J2YyNzQnLCdpbmR1c3RyeSc6J2YyNzUnLCdtYXAtcGluJzonZjI3NicsJ21hcC1zaWducyc6J2YyNzcnLCdtYXAtbyc6J2YyNzgnLCdtYXAnOidmMjc5JywnY29tbWVudGluZyc6J2YyN2EnLCdjb21tZW50aW5nLW8nOidmMjdiJywnaG91enonOidmMjdjJywndmltZW8nOidmMjdkJywnYmxhY2stdGllJzonZjI3ZScsJ2ZvbnRpY29ucyc6J2YyODAnLCdyZWRkaXQtYWxpZW4nOidmMjgxJywnZWRnZSc6J2YyODInLCdjcmVkaXQtY2FyZC1hbHQnOidmMjgzJywnY29kaWVwaWUnOidmMjg0JywnbW9keCc6J2YyODUnLCdmb3J0LWF3ZXNvbWUnOidmMjg2JywndXNiJzonZjI4NycsJ3Byb2R1Y3QtaHVudCc6J2YyODgnLCdtaXhjbG91ZCc6J2YyODknLCdzY3JpYmQnOidmMjhhJywncGF1c2UtY2lyY2xlJzonZjI4YicsJ3BhdXNlLWNpcmNsZS1vJzonZjI4YycsJ3N0b3AtY2lyY2xlJzonZjI4ZCcsJ3N0b3AtY2lyY2xlLW8nOidmMjhlJywnc2hvcHBpbmctYmFnJzonZjI5MCcsJ3Nob3BwaW5nLWJhc2tldCc6J2YyOTEnLCdoYXNodGFnJzonZjI5MicsJ2JsdWV0b290aCc6J2YyOTMnLCdibHVldG9vdGgtYic6J2YyOTQnLCdwZXJjZW50JzonZjI5NScsJ2dpdGxhYic6J2YyOTYnLCd3cGJlZ2lubmVyJzonZjI5NycsJ3dwZm9ybXMnOidmMjk4JywnZW52aXJhJzonZjI5OScsJ3VuaXZlcnNhbC1hY2Nlc3MnOidmMjlhJywnd2hlZWxjaGFpci1hbHQnOidmMjliJywncXVlc3Rpb24tY2lyY2xlLW8nOidmMjljJywnYmxpbmQnOidmMjlkJywnYXVkaW8tZGVzY3JpcHRpb24nOidmMjllJywndm9sdW1lLWNvbnRyb2wtcGhvbmUnOidmMmEwJywnYnJhaWxsZSc6J2YyYTEnLCdhc3Npc3RpdmUtbGlzdGVuaW5nLXN5c3RlbXMnOidmMmEyJywnYXNsLWludGVycHJldGluZyxhbWVyaWNhbi1zaWduLWxhbmd1YWdlLWludGVycHJldGluZyc6J2YyYTMnLCdkZWFmbmVzcyxoYXJkLW9mLWhlYXJpbmcsZGVhZic6J2YyYTQnLCdnbGlkZSc6J2YyYTUnLCdnbGlkZS1nJzonZjJhNicsJ3NpZ25pbmcsc2lnbi1sYW5ndWFnZSc6J2YyYTcnLCdsb3ctdmlzaW9uJzonZjJhOCcsJ3ZpYWRlbyc6J2YyYTknLCd2aWFkZW8tc3F1YXJlJzonZjJhYScsJ3NuYXBjaGF0JzonZjJhYicsJ3NuYXBjaGF0LWdob3N0JzonZjJhYycsJ3NuYXBjaGF0LXNxdWFyZSc6J2YyYWQnLCdwaWVkLXBpcGVyJzonZjJhZScsJ2ZpcnN0LW9yZGVyJzonZjJiMCcsJ3lvYXN0JzonZjJiMScsJ3RoZW1laXNsZSc6J2YyYjInLCdnb29nbGUtcGx1cy1jaXJjbGUsZ29vZ2xlLXBsdXMtb2ZmaWNpYWwnOidmMmIzJywnZmEsZm9udC1hd2Vzb21lJzonZjJiNCd9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGljb24oZCkge1xyXG4gICAgICAgIHZhciBjb2RlO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pY29uTWFwICYmIG9wdGlvbnMuc2hvd0ljb25zICYmIG9wdGlvbnMuaWNvbnMpIHtcclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dICYmIG9wdGlvbnMuaWNvbk1hcFtvcHRpb25zLmljb25zW2QubGFiZWxzWzBdXV0pIHtcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBvcHRpb25zLmljb25NYXBbb3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV1dO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaWNvbk1hcFtkLmxhYmVsc1swXV0pIHtcclxuICAgICAgICAgICAgICAgIGNvZGUgPSBvcHRpb25zLmljb25NYXBbZC5sYWJlbHNbMF1dO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMuaWNvbnNbZC5sYWJlbHNbMF1dKSB7XHJcbiAgICAgICAgICAgICAgICBjb2RlID0gb3B0aW9ucy5pY29uc1tkLmxhYmVsc1swXV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb2RlO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGltYWdlKGQpIHtcclxuICAgICAgICB2YXIgaSwgaW1hZ2VzRm9yTGFiZWwsIGltZywgaW1nTGV2ZWwsIGxhYmVsLCBsYWJlbFByb3BlcnR5VmFsdWUsIHByb3BlcnR5LCB2YWx1ZTtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaW1hZ2VzKSB7XHJcbiAgICAgICAgICAgIGltYWdlc0ZvckxhYmVsID0gb3B0aW9ucy5pbWFnZU1hcFtkLmxhYmVsc1swXV07XHJcblxyXG4gICAgICAgICAgICBpZiAoaW1hZ2VzRm9yTGFiZWwpIHtcclxuICAgICAgICAgICAgICAgIGltZ0xldmVsID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaW1hZ2VzRm9yTGFiZWwubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbFByb3BlcnR5VmFsdWUgPSBpbWFnZXNGb3JMYWJlbFtpXS5zcGxpdCgnfCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGxhYmVsUHJvcGVydHlWYWx1ZS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGxhYmVsUHJvcGVydHlWYWx1ZVsyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5ID0gbGFiZWxQcm9wZXJ0eVZhbHVlWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWwgPSBsYWJlbFByb3BlcnR5VmFsdWVbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZC5sYWJlbHNbMF0gPT09IGxhYmVsICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICghcHJvcGVydHkgfHwgZC5wcm9wZXJ0aWVzW3Byb3BlcnR5XSAhPT0gdW5kZWZpbmVkKSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoIXZhbHVlIHx8IGQucHJvcGVydGllc1twcm9wZXJ0eV0gPT09IHZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobGFiZWxQcm9wZXJ0eVZhbHVlLmxlbmd0aCA+IGltZ0xldmVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWcgPSBvcHRpb25zLmltYWdlc1tpbWFnZXNGb3JMYWJlbFtpXV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbWdMZXZlbCA9IGxhYmVsUHJvcGVydHlWYWx1ZS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpbWc7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaW5pdChfc2VsZWN0b3IsIF9vcHRpb25zKSB7XHJcbiAgICAgICAgaW5pdEljb25NYXAoKTtcclxuXHJcbiAgICAgICAgbWVyZ2Uob3B0aW9ucywgX29wdGlvbnMpO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5pY29ucykge1xyXG4gICAgICAgICAgICBvcHRpb25zLnNob3dJY29ucyA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIW9wdGlvbnMubWluQ29sbGlzaW9uKSB7XHJcbiAgICAgICAgICAgIG9wdGlvbnMubWluQ29sbGlzaW9uID0gb3B0aW9ucy5ub2RlUmFkaXVzICogMjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGluaXRJbWFnZU1hcCgpO1xyXG5cclxuICAgICAgICBzZWxlY3RvciA9IF9zZWxlY3RvcjtcclxuXHJcbiAgICAgICAgY29udGFpbmVyID0gZDMuc2VsZWN0KHNlbGVjdG9yKTtcclxuXHJcbiAgICAgICAgY29udGFpbmVyLmF0dHIoJ2NsYXNzJywgJ25lbzRqZDMnKVxyXG4gICAgICAgICAgICAgICAgIC5odG1sKCcnKTtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5mb1BhbmVsKSB7XHJcbiAgICAgICAgICAgIGluZm8gPSBhcHBlbmRJbmZvUGFuZWwoY29udGFpbmVyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFwcGVuZEdyYXBoKGNvbnRhaW5lcik7XHJcblxyXG4gICAgICAgIHNpbXVsYXRpb24gPSBpbml0U2ltdWxhdGlvbigpO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5uZW80akRhdGEpIHtcclxuICAgICAgICAgICAgbG9hZE5lbzRqRGF0YShvcHRpb25zLm5lbzRqRGF0YSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zLm5lbzRqRGF0YVVybCkge1xyXG4gICAgICAgICAgICBsb2FkTmVvNGpEYXRhRnJvbVVybChvcHRpb25zLm5lbzRqRGF0YVVybCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3I6IGJvdGggbmVvNGpEYXRhIGFuZCBuZW80akRhdGFVcmwgYXJlIGVtcHR5IScpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpbml0SWNvbk1hcCgpIHtcclxuICAgICAgICBPYmplY3Qua2V5cyhvcHRpb25zLmljb25NYXApLmZvckVhY2goZnVuY3Rpb24oa2V5LCBpbmRleCkge1xyXG4gICAgICAgICAgICB2YXIga2V5cyA9IGtleS5zcGxpdCgnLCcpLFxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBvcHRpb25zLmljb25NYXBba2V5XTtcclxuXHJcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcclxuICAgICAgICAgICAgICAgIG9wdGlvbnMuaWNvbk1hcFtrZXldID0gdmFsdWU7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGluaXRJbWFnZU1hcCgpIHtcclxuICAgICAgICB2YXIga2V5LCBrZXlzLCBzZWxlY3RvcjtcclxuXHJcbiAgICAgICAgZm9yIChrZXkgaW4gb3B0aW9ucy5pbWFnZXMpIHtcclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuaW1hZ2VzLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICAgICAgICAgIGtleXMgPSBrZXkuc3BsaXQoJ3wnKTtcclxuXG4gICAgICAgICAgICAgICAgaWYgKCFvcHRpb25zLmltYWdlTWFwW2tleXNbMF1dKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuaW1hZ2VNYXBba2V5c1swXV0gPSBba2V5XTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5pbWFnZU1hcFtrZXlzWzBdXS5wdXNoKGtleSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaW5pdFNpbXVsYXRpb24oKSB7XHJcbiAgICAgICAgdmFyIHNpbXVsYXRpb24gPSBkMy5mb3JjZVNpbXVsYXRpb24oKVxyXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgIC52ZWxvY2l0eURlY2F5KDAuOClcclxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAuZm9yY2UoJ3gnLCBkMy5mb3JjZSgpLnN0cmVuZ3RoKDAuMDAyKSlcclxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAuZm9yY2UoJ3knLCBkMy5mb3JjZSgpLnN0cmVuZ3RoKDAuMDAyKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZvcmNlKCdjb2xsaWRlJywgZDMuZm9yY2VDb2xsaWRlKCkucmFkaXVzKGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLm1pbkNvbGxpc2lvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuaXRlcmF0aW9ucygyKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZvcmNlKCdjaGFyZ2UnLCBkMy5mb3JjZU1hbnlCb2R5KCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5mb3JjZSgnbGluaycsIGQzLmZvcmNlTGluaygpLmlkKGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLmlkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZvcmNlKCdjZW50ZXInLCBkMy5mb3JjZUNlbnRlcihzdmcubm9kZSgpLnBhcmVudEVsZW1lbnQucGFyZW50RWxlbWVudC5jbGllbnRXaWR0aCAvIDIsIHN2Zy5ub2RlKCkucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LmNsaWVudEhlaWdodCAvIDIpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAub24oJ3RpY2snLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpY2soKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLm9uKCdlbmQnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLnpvb21GaXQgJiYgIWp1c3RMb2FkZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBqdXN0TG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6b29tRml0KDIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHNpbXVsYXRpb247XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZE5lbzRqRGF0YSgpIHtcclxuICAgICAgICBub2RlcyA9IFtdO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcHMgPSBbXTtcclxuXHJcbiAgICAgICAgdXBkYXRlV2l0aE5lbzRqRGF0YShvcHRpb25zLm5lbzRqRGF0YSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbG9hZE5lbzRqRGF0YUZyb21VcmwobmVvNGpEYXRhVXJsKSB7XHJcbiAgICAgICAgbm9kZXMgPSBbXTtcclxuICAgICAgICByZWxhdGlvbnNoaXBzID0gW107XHJcblxyXG4gICAgICAgIGQzLmpzb24obmVvNGpEYXRhVXJsLCBmdW5jdGlvbihlcnJvciwgZGF0YSkge1xyXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB1cGRhdGVXaXRoTmVvNGpEYXRhKGRhdGEpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1lcmdlKHRhcmdldCwgc291cmNlKSB7XHJcbiAgICAgICAgT2JqZWN0LmtleXMoc291cmNlKS5mb3JFYWNoKGZ1bmN0aW9uKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgIHRhcmdldFtwcm9wZXJ0eV0gPSBzb3VyY2VbcHJvcGVydHldO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG5lbzRqRGF0YVRvRDNEYXRhKGRhdGEpIHtcclxuICAgICAgICB2YXIgZ3JhcGggPSB7XHJcbiAgICAgICAgICAgIG5vZGVzOiBbXSxcclxuICAgICAgICAgICAgcmVsYXRpb25zaGlwczogW11cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBkYXRhLnJlc3VsdHMuZm9yRWFjaChmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZm9yRWFjaChmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBkYXRhLmdyYXBoLm5vZGVzLmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghY29udGFpbnMoZ3JhcGgubm9kZXMsIG5vZGUuaWQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyYXBoLm5vZGVzLnB1c2gobm9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzLmZvckVhY2goZnVuY3Rpb24ocmVsYXRpb25zaGlwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVsYXRpb25zaGlwLnNvdXJjZSA9IHJlbGF0aW9uc2hpcC5zdGFydE5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVsYXRpb25zaGlwLnRhcmdldCA9IHJlbGF0aW9uc2hpcC5lbmROb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgIGdyYXBoLnJlbGF0aW9uc2hpcHMucHVzaChyZWxhdGlvbnNoaXApO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhLnNvdXJjZSA+IGIuc291cmNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYS5zb3VyY2UgPCBiLnNvdXJjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGEudGFyZ2V0ID4gYi50YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYS50YXJnZXQgPCBiLnRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpICE9PSAwICYmIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpXS5zb3VyY2UgPT09IGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpLTFdLnNvdXJjZSAmJiBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaV0udGFyZ2V0ID09PSBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaS0xXS50YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5ncmFwaC5yZWxhdGlvbnNoaXBzW2ldLmxpbmtudW0gPSBkYXRhLmdyYXBoLnJlbGF0aW9uc2hpcHNbaSAtIDFdLmxpbmtudW0gKyAxO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuZ3JhcGgucmVsYXRpb25zaGlwc1tpXS5saW5rbnVtID0gMTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gZ3JhcGg7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmFuZG9tRDNEYXRhKGQsIG1heE5vZGVzVG9HZW5lcmF0ZSkge1xyXG4gICAgICAgIHZhciBkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgbm9kZXM6IFtdLFxyXG4gICAgICAgICAgICAgICAgcmVsYXRpb25zaGlwczogW11cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgaSxcclxuICAgICAgICAgICAgbGFiZWwsXHJcbiAgICAgICAgICAgIG5vZGUsXHJcbiAgICAgICAgICAgIG51bU5vZGVzID0gKG1heE5vZGVzVG9HZW5lcmF0ZSAqIE1hdGgucmFuZG9tKCkgPDwgMCkgKyAxLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXAsXHJcbiAgICAgICAgICAgIHMgPSBzaXplKCk7XHJcblxyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBudW1Ob2RlczsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxhYmVsID0gcmFuZG9tTGFiZWwoKTtcclxuXHJcbiAgICAgICAgICAgIG5vZGUgPSB7XHJcbiAgICAgICAgICAgICAgICBpZDogcy5ub2RlcyArIDEgKyBpLFxyXG4gICAgICAgICAgICAgICAgbGFiZWxzOiBbbGFiZWxdLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmRvbTogbGFiZWxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB4OiBkLngsXHJcbiAgICAgICAgICAgICAgICB5OiBkLnlcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGRhdGEubm9kZXNbZGF0YS5ub2Rlcy5sZW5ndGhdID0gbm9kZTtcclxuXHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcCA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBzLnJlbGF0aW9uc2hpcHMgKyAxICsgaSxcclxuICAgICAgICAgICAgICAgIHR5cGU6IGxhYmVsLnRvVXBwZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICBzdGFydE5vZGU6IGQuaWQsXHJcbiAgICAgICAgICAgICAgICBlbmROb2RlOiBzLm5vZGVzICsgMSArIGksXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZnJvbTogRGF0ZS5ub3coKVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNvdXJjZTogZC5pZCxcclxuICAgICAgICAgICAgICAgIHRhcmdldDogcy5ub2RlcyArIDEgKyBpLFxyXG4gICAgICAgICAgICAgICAgbGlua251bTogcy5yZWxhdGlvbnNoaXBzICsgMSArIGlcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGRhdGEucmVsYXRpb25zaGlwc1tkYXRhLnJlbGF0aW9uc2hpcHMubGVuZ3RoXSA9IHJlbGF0aW9uc2hpcDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJhbmRvbUxhYmVsKCkge1xyXG4gICAgICAgIHZhciBpY29ucyA9IE9iamVjdC5rZXlzKG9wdGlvbnMuaWNvbk1hcCk7XHJcbiAgICAgICAgcmV0dXJuIGljb25zW2ljb25zLmxlbmd0aCAqIE1hdGgucmFuZG9tKCkgPDwgMF07XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcm90YXRlKGN4LCBjeSwgeCwgeSwgYW5nbGUpIHtcclxuICAgICAgICB2YXIgcmFkaWFucyA9IChNYXRoLlBJIC8gMTgwKSAqIGFuZ2xlLFxyXG4gICAgICAgICAgICBjb3MgPSBNYXRoLmNvcyhyYWRpYW5zKSxcclxuICAgICAgICAgICAgc2luID0gTWF0aC5zaW4ocmFkaWFucyksXHJcbiAgICAgICAgICAgIG54ID0gKGNvcyAqICh4IC0gY3gpKSArIChzaW4gKiAoeSAtIGN5KSkgKyBjeCxcclxuICAgICAgICAgICAgbnkgPSAoY29zICogKHkgLSBjeSkpIC0gKHNpbiAqICh4IC0gY3gpKSArIGN5O1xyXG5cclxuICAgICAgICByZXR1cm4geyB4OiBueCwgeTogbnkgfTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByb3RhdGVQb2ludChjLCBwLCBhbmdsZSkge1xyXG4gICAgICAgIHJldHVybiByb3RhdGUoYy54LCBjLnksIHAueCwgcC55LCBhbmdsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcm90YXRpb24oc291cmNlLCB0YXJnZXQpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5hdGFuMih0YXJnZXQueSAtIHNvdXJjZS55LCB0YXJnZXQueCAtIHNvdXJjZS54KSAqIDE4MCAvIE1hdGguUEk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2l6ZSgpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBub2Rlczogbm9kZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICByZWxhdGlvbnNoaXBzOiByZWxhdGlvbnNoaXBzLmxlbmd0aFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbi8qXHJcbiAgICBmdW5jdGlvbiBzbW9vdGhUcmFuc2Zvcm0oZWxlbSwgdHJhbnNsYXRlLCBzY2FsZSkge1xyXG4gICAgICAgIHZhciBhbmltYXRpb25NaWxsaXNlY29uZHMgPSA1MDAwLFxyXG4gICAgICAgICAgICB0aW1lb3V0TWlsbGlzZWNvbmRzID0gNTAsXHJcbiAgICAgICAgICAgIHN0ZXBzID0gcGFyc2VJbnQoYW5pbWF0aW9uTWlsbGlzZWNvbmRzIC8gdGltZW91dE1pbGxpc2Vjb25kcyk7XHJcblxyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNtb290aFRyYW5zZm9ybVN0ZXAoZWxlbSwgdHJhbnNsYXRlLCBzY2FsZSwgdGltZW91dE1pbGxpc2Vjb25kcywgMSwgc3RlcHMpO1xyXG4gICAgICAgIH0sIHRpbWVvdXRNaWxsaXNlY29uZHMpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNtb290aFRyYW5zZm9ybVN0ZXAoZWxlbSwgdHJhbnNsYXRlLCBzY2FsZSwgdGltZW91dE1pbGxpc2Vjb25kcywgc3RlcCwgc3RlcHMpIHtcclxuICAgICAgICB2YXIgcHJvZ3Jlc3MgPSBzdGVwIC8gc3RlcHM7XHJcblxyXG4gICAgICAgIGVsZW0uYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgKHRyYW5zbGF0ZVswXSAqIHByb2dyZXNzKSArICcsICcgKyAodHJhbnNsYXRlWzFdICogcHJvZ3Jlc3MpICsgJykgc2NhbGUoJyArIChzY2FsZSAqIHByb2dyZXNzKSArICcpJyk7XHJcblxyXG4gICAgICAgIGlmIChzdGVwIDwgc3RlcHMpIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHNtb290aFRyYW5zZm9ybVN0ZXAoZWxlbSwgdHJhbnNsYXRlLCBzY2FsZSwgdGltZW91dE1pbGxpc2Vjb25kcywgc3RlcCArIDEsIHN0ZXBzKTtcclxuICAgICAgICAgICAgfSwgdGltZW91dE1pbGxpc2Vjb25kcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4qL1xyXG4gICAgZnVuY3Rpb24gc3RpY2tOb2RlKGQpIHtcclxuICAgICAgICBkLmZ4ID0gZDMuZXZlbnQueDtcclxuICAgICAgICBkLmZ5ID0gZDMuZXZlbnQueTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrKCkge1xyXG4gICAgICAgIHRpY2tOb2RlcygpO1xyXG4gICAgICAgIHRpY2tSZWxhdGlvbnNoaXBzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja05vZGVzKCkge1xyXG4gICAgICAgIGlmIChub2RlKSB7XHJcbiAgICAgICAgICAgIG5vZGUuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIGQueCArICcsICcgKyBkLnkgKyAnKSc7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrUmVsYXRpb25zaGlwcygpIHtcclxuICAgICAgICBpZiAocmVsYXRpb25zaGlwKSB7XHJcbiAgICAgICAgICAgIHJlbGF0aW9uc2hpcC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYW5nbGUgPSByb3RhdGlvbihkLnNvdXJjZSwgZC50YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIGQuc291cmNlLnggKyAnLCAnICsgZC5zb3VyY2UueSArICcpIHJvdGF0ZSgnICsgYW5nbGUgKyAnKSc7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGlja1JlbGF0aW9uc2hpcHNUZXh0cygpO1xyXG4gICAgICAgICAgICB0aWNrUmVsYXRpb25zaGlwc091dGxpbmVzKCk7XHJcbiAgICAgICAgICAgIHRpY2tSZWxhdGlvbnNoaXBzT3ZlcmxheXMoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHNPdXRsaW5lcygpIHtcclxuICAgICAgICByZWxhdGlvbnNoaXAuZWFjaChmdW5jdGlvbihyZWxhdGlvbnNoaXApIHtcclxuICAgICAgICAgICAgdmFyIHJlbCA9IGQzLnNlbGVjdCh0aGlzKSxcclxuICAgICAgICAgICAgICAgIG91dGxpbmUgPSByZWwuc2VsZWN0KCcub3V0bGluZScpLFxyXG4gICAgICAgICAgICAgICAgdGV4dCA9IHJlbC5zZWxlY3QoJy50ZXh0JyksXHJcbiAgICAgICAgICAgICAgICBiYm94ID0gdGV4dC5ub2RlKCkuZ2V0QkJveCgpLFxyXG4gICAgICAgICAgICAgICAgcGFkZGluZyA9IDM7XHJcblxyXG4gICAgICAgICAgICBvdXRsaW5lLmF0dHIoJ2QnLCBmdW5jdGlvbihkKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY2VudGVyID0geyB4OiAwLCB5OiAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYW5nbGUgPSByb3RhdGlvbihkLnNvdXJjZSwgZC50YXJnZXQpLFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHRCb3VuZGluZ0JveCA9IHRleHQubm9kZSgpLmdldEJCb3goKSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0UGFkZGluZyA9IDUsXHJcbiAgICAgICAgICAgICAgICAgICAgdSA9IHVuaXRhcnlWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0TWFyZ2luID0geyB4OiAoZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAodGV4dEJvdW5kaW5nQm94LndpZHRoICsgdGV4dFBhZGRpbmcpICogdS54KSAqIDAuNSwgeTogKGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKHRleHRCb3VuZGluZ0JveC53aWR0aCArIHRleHRQYWRkaW5nKSAqIHUueSkgKiAwLjUgfSxcclxuICAgICAgICAgICAgICAgICAgICBuID0gdW5pdGFyeU5vcm1hbFZlY3RvcihkLnNvdXJjZSwgZC50YXJnZXQpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEExID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnggLSBuLngsIHk6IDAgKyAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgLSBuLnkgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEIxID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IHRleHRNYXJnaW4ueCAtIG4ueCwgeTogdGV4dE1hcmdpbi55IC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRDMSA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiB0ZXh0TWFyZ2luLngsIHk6IHRleHRNYXJnaW4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RDEgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogMCArIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCwgeTogMCArIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50QTIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSB0ZXh0TWFyZ2luLnggLSBuLngsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gdGV4dE1hcmdpbi55IC0gbi55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRCMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCAtIG4ueCAtIHUueCAqIG9wdGlvbnMuYXJyb3dTaXplLCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueSAtIG4ueSAtIHUueSAqIG9wdGlvbnMuYXJyb3dTaXplIH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRDMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCAtIG4ueCArIChuLnggLSB1LngpICogb3B0aW9ucy5hcnJvd1NpemUsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IC0gbi55ICsgKG4ueSAtIHUueSkgKiBvcHRpb25zLmFycm93U2l6ZSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlZFBvaW50RDIgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogZC50YXJnZXQueCAtIGQuc291cmNlLnggLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LngsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRFMiA9IHJvdGF0ZVBvaW50KGNlbnRlciwgeyB4OiBkLnRhcmdldC54IC0gZC5zb3VyY2UueCAtIChvcHRpb25zLm5vZGVSYWRpdXMgKyAxKSAqIHUueCArICgtIG4ueCAtIHUueCkgKiBvcHRpb25zLmFycm93U2l6ZSwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgLSAob3B0aW9ucy5ub2RlUmFkaXVzICsgMSkgKiB1LnkgKyAoLSBuLnkgLSB1LnkpICogb3B0aW9ucy5hcnJvd1NpemUgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEYyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS54IC0gdS54ICogb3B0aW9ucy5hcnJvd1NpemUsIHk6IGQudGFyZ2V0LnkgLSBkLnNvdXJjZS55IC0gKG9wdGlvbnMubm9kZVJhZGl1cyArIDEpICogdS55IC0gdS55ICogb3B0aW9ucy5hcnJvd1NpemUgfSwgYW5nbGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEcyID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gdGV4dE1hcmdpbi54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIHRleHRNYXJnaW4ueSB9LCBhbmdsZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuICdNICcgKyByb3RhdGVkUG9pbnRBMS54ICsgJyAnICsgcm90YXRlZFBvaW50QTEueSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRCMS54ICsgJyAnICsgcm90YXRlZFBvaW50QjEueSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnRDMS54ICsgJyAnICsgcm90YXRlZFBvaW50QzEueSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgJyBMICcgKyByb3RhdGVkUG9pbnREMS54ICsgJyAnICsgcm90YXRlZFBvaW50RDEueSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgJyBaIE0gJyArIHJvdGF0ZWRQb2ludEEyLnggKyAnICcgKyByb3RhdGVkUG9pbnRBMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEIyLnggKyAnICcgKyByb3RhdGVkUG9pbnRCMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEMyLnggKyAnICcgKyByb3RhdGVkUG9pbnRDMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEQyLnggKyAnICcgKyByb3RhdGVkUG9pbnREMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEUyLnggKyAnICcgKyByb3RhdGVkUG9pbnRFMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEYyLnggKyAnICcgKyByb3RhdGVkUG9pbnRGMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAgICAnIEwgJyArIHJvdGF0ZWRQb2ludEcyLnggKyAnICcgKyByb3RhdGVkUG9pbnRHMi55ICtcclxuICAgICAgICAgICAgICAgICAgICAgICAnIFonO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0aWNrUmVsYXRpb25zaGlwc092ZXJsYXlzKCkge1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcE92ZXJsYXkuYXR0cignZCcsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgdmFyIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICAgICAgYW5nbGUgPSByb3RhdGlvbihkLnNvdXJjZSwgZC50YXJnZXQpLFxyXG4gICAgICAgICAgICAgICAgbjEgPSB1bml0YXJ5Tm9ybWFsVmVjdG9yKGQuc291cmNlLCBkLnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICBuID0gdW5pdGFyeU5vcm1hbFZlY3RvcihkLnNvdXJjZSwgZC50YXJnZXQsIDUwKSxcclxuICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEEgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogMCAtIG4ueCwgeTogMCAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRCID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54IC0gbi54LCB5OiBkLnRhcmdldC55IC0gZC5zb3VyY2UueSAtIG4ueSB9LCBhbmdsZSksXHJcbiAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnRDID0gcm90YXRlUG9pbnQoY2VudGVyLCB7IHg6IGQudGFyZ2V0LnggLSBkLnNvdXJjZS54ICsgbi54IC0gbjEueCwgeTogZC50YXJnZXQueSAtIGQuc291cmNlLnkgKyBuLnkgLSBuMS55IH0sIGFuZ2xlKSxcclxuICAgICAgICAgICAgICAgIHJvdGF0ZWRQb2ludEQgPSByb3RhdGVQb2ludChjZW50ZXIsIHsgeDogMCArIG4ueCAtIG4xLngsIHk6IDAgKyBuLnkgLSBuMS55IH0sIGFuZ2xlKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiAnTSAnICsgcm90YXRlZFBvaW50QS54ICsgJyAnICsgcm90YXRlZFBvaW50QS55ICtcclxuICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50Qi54ICsgJyAnICsgcm90YXRlZFBvaW50Qi55ICtcclxuICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50Qy54ICsgJyAnICsgcm90YXRlZFBvaW50Qy55ICtcclxuICAgICAgICAgICAgICAgICAgICcgTCAnICsgcm90YXRlZFBvaW50RC54ICsgJyAnICsgcm90YXRlZFBvaW50RC55ICtcclxuICAgICAgICAgICAgICAgICAgICcgWic7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdGlja1JlbGF0aW9uc2hpcHNUZXh0cygpIHtcclxuICAgICAgICByZWxhdGlvbnNoaXBUZXh0LmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uKGQpIHtcclxuICAgICAgICAgICAgdmFyIGFuZ2xlID0gKHJvdGF0aW9uKGQuc291cmNlLCBkLnRhcmdldCkgKyAzNjApICUgMzYwLFxyXG4gICAgICAgICAgICAgICAgbWlycm9yID0gYW5nbGUgPiA5MCAmJiBhbmdsZSA8IDI3MCxcclxuICAgICAgICAgICAgICAgIGNlbnRlciA9IHsgeDogMCwgeTogMCB9LFxyXG4gICAgICAgICAgICAgICAgbiA9IHVuaXRhcnlOb3JtYWxWZWN0b3IoZC5zb3VyY2UsIGQudGFyZ2V0KSxcclxuICAgICAgICAgICAgICAgIG5XZWlnaHQgPSBtaXJyb3IgPyAyIDogLTMsXHJcbiAgICAgICAgICAgICAgICBwb2ludCA9IHsgeDogKGQudGFyZ2V0LnggLSBkLnNvdXJjZS54KSAqIDAuNSArIG4ueCAqIG5XZWlnaHQsIHk6IChkLnRhcmdldC55IC0gZC5zb3VyY2UueSkgKiAwLjUgKyBuLnkgKiBuV2VpZ2h0IH0sXHJcbiAgICAgICAgICAgICAgICByb3RhdGVkUG9pbnQgPSByb3RhdGVQb2ludChjZW50ZXIsIHBvaW50LCBhbmdsZSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgcm90YXRlZFBvaW50LnggKyAnLCAnICsgcm90YXRlZFBvaW50LnkgKyAnKSByb3RhdGUoJyArIChtaXJyb3IgPyAxODAgOiAwKSArICcpJztcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0b1N0cmluZyhkKSB7XHJcbiAgICAgICAgdmFyIHMgPSBkLmxhYmVscyA/IGQubGFiZWxzWzBdIDogZC50eXBlO1xyXG5cclxuICAgICAgICBzICs9ICcgKDxpZD46ICcgKyBkLmlkO1xyXG5cclxuICAgICAgICBPYmplY3Qua2V5cyhkLnByb3BlcnRpZXMpLmZvckVhY2goZnVuY3Rpb24ocHJvcGVydHkpIHtcclxuICAgICAgICAgICAgcyArPSAnLCAnICsgcHJvcGVydHkgKyAnOiAnICsgSlNPTi5zdHJpbmdpZnkoZC5wcm9wZXJ0aWVzW3Byb3BlcnR5XSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHMgKz0gJyknO1xyXG5cclxuICAgICAgICByZXR1cm4gcztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1bml0YXJ5Tm9ybWFsVmVjdG9yKHNvdXJjZSwgdGFyZ2V0LCBuZXdMZW5ndGgpIHtcclxuICAgICAgICB2YXIgY2VudGVyID0geyB4OiAwLCB5OiAwIH0sXHJcbiAgICAgICAgICAgIHZlY3RvciA9IHVuaXRhcnlWZWN0b3Ioc291cmNlLCB0YXJnZXQsIG5ld0xlbmd0aCk7XHJcblxyXG4gICAgICAgIHJldHVybiByb3RhdGVQb2ludChjZW50ZXIsIHZlY3RvciwgOTApO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVuaXRhcnlWZWN0b3Ioc291cmNlLCB0YXJnZXQsIG5ld0xlbmd0aCkge1xyXG4gICAgICAgIHZhciBsZW5ndGggPSBNYXRoLnNxcnQoTWF0aC5wb3codGFyZ2V0LnggLSBzb3VyY2UueCwgMikgKyBNYXRoLnBvdyh0YXJnZXQueSAtIHNvdXJjZS55LCAyKSkgLyBNYXRoLnNxcnQobmV3TGVuZ3RoIHx8IDEpO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB4OiAodGFyZ2V0LnggLSBzb3VyY2UueCkgLyBsZW5ndGgsXHJcbiAgICAgICAgICAgIHk6ICh0YXJnZXQueSAtIHNvdXJjZS55KSAvIGxlbmd0aCxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVdpdGhEM0RhdGEoZDNEYXRhKSB7XHJcbiAgICAgICAgdXBkYXRlTm9kZXNBbmRSZWxhdGlvbnNoaXBzKGQzRGF0YS5ub2RlcywgZDNEYXRhLnJlbGF0aW9uc2hpcHMpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVdpdGhOZW80akRhdGEobmVvNGpEYXRhKSB7XHJcbiAgICAgICAgdmFyIGQzRGF0YSA9IG5lbzRqRGF0YVRvRDNEYXRhKG5lbzRqRGF0YSk7XG4gICAgICAgIHVwZGF0ZVdpdGhEM0RhdGEoZDNEYXRhKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVJbmZvKGQpIHtcclxuICAgICAgICBjbGVhckluZm8oKTtcclxuXHJcbiAgICAgICAgaWYgKGQubGFiZWxzKSB7XHJcbiAgICAgICAgICAgIGFwcGVuZEluZm9FbGVtZW50Q2xhc3MoJ2NsYXNzJywgZC5sYWJlbHNbMF0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGFwcGVuZEluZm9FbGVtZW50UmVsYXRpb25zaGlwKCdjbGFzcycsIGQudHlwZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KCdwcm9wZXJ0eScsICcmbHQ7aWQmZ3Q7JywgZC5pZCk7XHJcblxyXG4gICAgICAgIE9iamVjdC5rZXlzKGQucHJvcGVydGllcykuZm9yRWFjaChmdW5jdGlvbihwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICBhcHBlbmRJbmZvRWxlbWVudFByb3BlcnR5KCdwcm9wZXJ0eScsIHByb3BlcnR5LCBKU09OLnN0cmluZ2lmeShkLnByb3BlcnRpZXNbcHJvcGVydHldKSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlTm9kZXMobikge1xyXG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KG5vZGVzLCBuKTtcclxuXHJcbiAgICAgICAgbm9kZSA9IHN2Z05vZGVzLnNlbGVjdEFsbCgnLm5vZGUnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgIC5kYXRhKG5vZGVzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmlkOyB9KTtcclxuICAgICAgICB2YXIgbm9kZUVudGVyID0gYXBwZW5kTm9kZVRvR3JhcGgoKTtcclxuICAgICAgICBub2RlID0gbm9kZUVudGVyLm1lcmdlKG5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZU5vZGVzQW5kUmVsYXRpb25zaGlwcyhuLCByKSB7XHJcbiAgICAgICAgdXBkYXRlUmVsYXRpb25zaGlwcyhyKTtcclxuICAgICAgICB1cGRhdGVOb2RlcyhuKTtcclxuXHJcbiAgICAgICAgc2ltdWxhdGlvbi5ub2Rlcyhub2Rlcyk7XHJcbiAgICAgICAgc2ltdWxhdGlvbi5mb3JjZSgnbGluaycpLmxpbmtzKHJlbGF0aW9uc2hpcHMpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVJlbGF0aW9uc2hpcHMocikge1xyXG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHJlbGF0aW9uc2hpcHMsIHIpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXAgPSBzdmdSZWxhdGlvbnNoaXBzLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5kYXRhKHJlbGF0aW9uc2hpcHMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaWQ7IH0pO1xyXG5cclxuICAgICAgICB2YXIgcmVsYXRpb25zaGlwRW50ZXIgPSBhcHBlbmRSZWxhdGlvbnNoaXBUb0dyYXBoKCk7XHJcblxyXG4gICAgICAgIHJlbGF0aW9uc2hpcCA9IHJlbGF0aW9uc2hpcEVudGVyLnJlbGF0aW9uc2hpcC5tZXJnZShyZWxhdGlvbnNoaXApO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXBPdXRsaW5lID0gc3ZnLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCAub3V0bGluZScpO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcE91dGxpbmUgPSByZWxhdGlvbnNoaXBFbnRlci5vdXRsaW5lLm1lcmdlKHJlbGF0aW9uc2hpcE91dGxpbmUpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXBPdmVybGF5ID0gc3ZnLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCAub3ZlcmxheScpO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcE92ZXJsYXkgPSByZWxhdGlvbnNoaXBFbnRlci5vdmVybGF5Lm1lcmdlKHJlbGF0aW9uc2hpcE92ZXJsYXkpO1xyXG5cclxuICAgICAgICByZWxhdGlvbnNoaXBUZXh0ID0gc3ZnLnNlbGVjdEFsbCgnLnJlbGF0aW9uc2hpcCAudGV4dCcpO1xyXG4gICAgICAgIHJlbGF0aW9uc2hpcFRleHQgPSByZWxhdGlvbnNoaXBFbnRlci50ZXh0Lm1lcmdlKHJlbGF0aW9uc2hpcFRleHQpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHZlcnNpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIFZFUlNJT047XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gem9vbUZpdCh0cmFuc2l0aW9uRHVyYXRpb24pIHtcclxuICAgICAgICB2YXIgYm91bmRzID0gc3ZnLm5vZGUoKS5nZXRCQm94KCksXHJcbiAgICAgICAgICAgIHBhcmVudCA9IHN2Zy5ub2RlKCkucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50LFxyXG4gICAgICAgICAgICBmdWxsV2lkdGggPSBwYXJlbnQuY2xpZW50V2lkdGgsXHJcbiAgICAgICAgICAgIGZ1bGxIZWlnaHQgPSBwYXJlbnQuY2xpZW50SGVpZ2h0LFxyXG4gICAgICAgICAgICB3aWR0aCA9IGJvdW5kcy53aWR0aCxcclxuICAgICAgICAgICAgaGVpZ2h0ID0gYm91bmRzLmhlaWdodCxcclxuICAgICAgICAgICAgbWlkWCA9IGJvdW5kcy54ICsgd2lkdGggLyAyLFxyXG4gICAgICAgICAgICBtaWRZID0gYm91bmRzLnkgKyBoZWlnaHQgLyAyO1xyXG5cclxuICAgICAgICBpZiAod2lkdGggPT09IDAgfHwgaGVpZ2h0ID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybjsgLy8gbm90aGluZyB0byBmaXRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN2Z1NjYWxlID0gMC44NSAvIE1hdGgubWF4KHdpZHRoIC8gZnVsbFdpZHRoLCBoZWlnaHQgLyBmdWxsSGVpZ2h0KTtcclxuICAgICAgICBzdmdUcmFuc2xhdGUgPSBbZnVsbFdpZHRoIC8gMiAtIHN2Z1NjYWxlICogbWlkWCwgZnVsbEhlaWdodCAvIDIgLSBzdmdTY2FsZSAqIG1pZFldO1xyXG5cclxuICAgICAgICBzdmcuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgc3ZnVHJhbnNsYXRlWzBdICsgJywgJyArIHN2Z1RyYW5zbGF0ZVsxXSArICcpIHNjYWxlKCcgKyBzdmdTY2FsZSArICcpJyk7XHJcbi8vICAgICAgICBzbW9vdGhUcmFuc2Zvcm0oc3ZnVHJhbnNsYXRlLCBzdmdTY2FsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgaW5pdChfc2VsZWN0b3IsIF9vcHRpb25zKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGFwcGVuZFJhbmRvbURhdGFUb05vZGU6IGFwcGVuZFJhbmRvbURhdGFUb05vZGUsXHJcbiAgICAgICAgbmVvNGpEYXRhVG9EM0RhdGE6IG5lbzRqRGF0YVRvRDNEYXRhLFxyXG4gICAgICAgIHJhbmRvbUQzRGF0YTogcmFuZG9tRDNEYXRhLFxyXG4gICAgICAgIHNpemU6IHNpemUsXHJcbiAgICAgICAgdXBkYXRlV2l0aEQzRGF0YTogdXBkYXRlV2l0aEQzRGF0YSxcclxuICAgICAgICB1cGRhdGVXaXRoTmVvNGpEYXRhOiB1cGRhdGVXaXRoTmVvNGpEYXRhLFxyXG4gICAgICAgIHZlcnNpb246IHZlcnNpb25cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTmVvNGpEMztcclxuIl19
