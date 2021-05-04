// Copyright 2014 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for interacting with forms when carrrying
 * out end-to-end testing with protractor.
 */

// Note: Instantiating some of the editors, e.g. RichTextEditor, occurs
// asynchronously and so must be prefixed by "await".

var richTextComponents = require(
  '../../../extensions/rich_text_components/protractor.js');
var objects = require('../../../extensions/objects/protractor.js');
var action = require('./action.js');
var waitFor = require('./waitFor.js');

var DictionaryEditor = function(elem) {
  return {
    editEntry: async function(index, objectType) {
      var entry = elem.element(
        await by.repeater('property in propertySchemas()').
          row(index));
      var editor = getEditor(objectType);
      return await editor(entry);
    }
  };
};

var GraphEditor = function(graphInputContainer) {
  if (!graphInputContainer) {
    throw new Error('Please provide Graph Input Container element');
  }
  var vertexElement = function(index) {
    // Would throw incorrect element error if provided incorrect index number.
    // Node index starts at 0.
    return graphInputContainer.element(by.css(
      '.protractor-test-graph-vertex-' + index));
  };

  var createVertex = async function(xOffset, yOffset) {
    var addNodeButton = graphInputContainer.element(
      by.css('.protractor-test-Add-Node-button'));
    await action.click('Add Node Button', addNodeButton);
    // Offsetting from the graph container.
    await waitFor.visibilityOf(
      graphInputContainer, 'Graph Input Container taking too long to appear');
    await browser.actions().mouseMove(
      graphInputContainer, {x: xOffset, y: yOffset}).perform();
    await browser.actions().click().perform();
  };

  var createEdge = async function(vertexIndex1, vertexIndex2) {
    var addEdgeButton = graphInputContainer.element(
      by.css('.protractor-test-Add-Edge-button'));
    await action.click('Add Edge Button', addEdgeButton);
    await waitFor.visibilityOf(
      vertexElement(
        vertexIndex1), `Vertex element ${vertexIndex1} taking too long`);
    await browser.actions().mouseMove(
      vertexElement(vertexIndex1)).perform();
    await browser.actions().mouseDown().perform();
    await waitFor.visibilityOf(
      vertexElement(
        vertexIndex2), `Vertex element ${vertexIndex2} taking too long`);
    await browser.actions().mouseMove(
      vertexElement(vertexIndex2)).perform();
    await browser.actions().mouseUp().perform();
  };
  return {
    setValue: async function(graphDict) {
      var nodeCoordinatesList = graphDict.vertices;
      var edgesList = graphDict.edges;
      if (nodeCoordinatesList) {
        expect(nodeCoordinatesList.length).toBeGreaterThan(0);
        // Assume x-coord is at index 0.
        for (coordinateElement of nodeCoordinatesList) {
          await createVertex(coordinateElement[0], coordinateElement[1]);
        }
      }
      if (edgesList) {
        for (edgeElement of edgesList) {
          await createEdge(edgeElement[0], edgeElement[1]);
        }
      }
    },
    clearDefaultGraph: async function() {
      var deleteButton = graphInputContainer.element(
        by.css('.protractor-test-Delete-button'));
      await action.click('Delete Button', deleteButton);
      // Sample graph comes with 3 vertices.
      for (var i = 2; i >= 0; i--) {
        await action.click(`Vertex Element ${i}`, vertexElement(i));
      }
    },
    expectCurrentGraphToBe: async function(graphDict) {
      var nodeCoordinatesList = graphDict.vertices;
      var edgesList = graphDict.edges;
      if (nodeCoordinatesList) {
        // Expecting total no. of vertices on the graph matches with the given
        // dict's vertices.
        for (var i = 0; i < nodeCoordinatesList.length; i++) {
          expect(await vertexElement(i).isDisplayed()).toBe(true);
        }
      }
      if (edgesList) {
        // Expecting total no. of edges on the graph matches with the given
        // dict's edges.
        var allEdgesElement = element.all(by.css(
          '.protractor-test-graph-edge'));
        await waitFor.visibilityOf(
          allEdgesElement, 'All edges element taking too long to appear');
        expect(await allEdgesElement.count()).toEqual(edgesList.length);
      }
    }
  };
};

var ListEditor = function(elem) {
  // NOTE: this returns a promise, not an integer.
  var _getLength = async function() {
    var items = (
      await elem.all(by.repeater('item in localValue track by $index')));
    return items.length;
  };
  // If objectType is specified this returns an editor for objects of that type
  // which can be used to make changes to the newly-added item (for example
  // by calling setValue() on it). Clients should ensure the given objectType
  // corresponds to the type of elements in the list.
  // If objectType is not specified, this function returns nothing.
  var addItem = async function(objectType = null) {
    var listLength = await _getLength();
    var AddListEntry = elem.element(by.css(
      '.protractor-test-add-list-entry'));
    await action.click('Add List Entry', AddListEntry);
    if (objectType !== null) {
      return await getEditor(objectType)(
        elem.element(
          await by.repeater(
            'item in localValue track by $index').row(listLength)));
    }
  };
  var deleteItem = async function(index) {
    var DeleteListEntry = elem.element(
      await by.repeater('item in localValue track by $index').row(index))
      .element(by.css('.protractor-test-delete-list-entry'));
    await action.click('Delete List Entry', DeleteListEntry);
  };

  return {
    editItem: async function(index, objectType) {
      var item = await elem.element(
        await by.repeater('item in localValue track by $index').row(index));
      var editor = getEditor(objectType);
      return await editor(item);
    },
    addItem: addItem,
    deleteItem: deleteItem,
    // This will add or delete list elements as necessary.
    setLength: async function(desiredLength) {
      var startingLength = await elem.all(
        await by.repeater('item in localValue track by $index')).count();
      for (var i = startingLength; i < desiredLength; i++) {
        await addItem();
      }
      for (var j = startingLength - 1; j >= desiredLength; j--) {
        await deleteItem(j);
      }
    }
  };
};

var RealEditor = function(elem) {
  return {
    setValue: async function(value) {
      var realEditorInput = elem.element(by.tagName('input'));
      await action.clear('Real Editor Input', realEditorInput);
      await action.sendKeys('Real Editor Input', realEditorInput, value);
    }
  };
};

var RichTextEditor = async function(elem) {
  // Set focus in the RTE.
  var firstOppiaRte = await elem.all(by.css('.oppia-rte')).first();
  await action.click('First Rich Text Editor', firstOppiaRte);

  var _appendContentText = async function(text) {
    var firstOppiaRte = await elem.all(by.css('.oppia-rte')).first();
    await action.sendKeys(
      'First Rich Text Editor', firstOppiaRte, text);
  };
  var _clickToolbarButton = async function(buttonName) {
    var clickToolbarButton = elem.element(by.css('.' + buttonName));
    await action.click(
      `Toolbar Button: ${buttonName}`, clickToolbarButton);
  };
  var _clearContent = async function() {
    expect(
      await (await elem.all(by.css('.oppia-rte')).first()).isPresent()
    ).toBe(true);
    var firstOppiaRte = await elem.all(by.css('.oppia-rte')).first();
    await action.clear('First Rich Text Editor', firstOppiaRte);
  };

  return {
    clear: async function() {
      await _clearContent();
    },
    setPlainText: async function(text) {
      await _clearContent();
      await _appendContentText(text);
    },
    appendPlainText: async function(text) {
      await _appendContentText(text);
    },
    appendBoldText: async function(text) {
      await _clickToolbarButton('cke_button__bold');
      await _appendContentText(text);
      await _clickToolbarButton('cke_button__bold');
    },
    appendItalicText: async function(text) {
      await _clickToolbarButton('cke_button__italic');
      await _appendContentText(text);
      await _clickToolbarButton('cke_button__italic');
    },
    appendOrderedList: async function(textArray) {
      await _appendContentText('\n');
      await _clickToolbarButton('cke_button__numberedlist');
      for (var i = 0; i < textArray.length; i++) {
        await _appendContentText(textArray[i] + '\n');
      }
      await _clickToolbarButton('cke_button__numberedlist');
    },
    appendUnorderedList: async function(textArray) {
      await _appendContentText('\n');
      await _clickToolbarButton('cke_button__bulletedlist');
      for (var i = 0; i < textArray.length; i++) {
        await _appendContentText(textArray[i] + '\n');
      }
      await _clickToolbarButton('cke_button__bulletedlist');
    },
    // This adds and customizes RTE components.
    // Additional arguments may be sent to this function, and they will be
    // passed on to the relevant RTE component editor.
    addRteComponent: async function(componentName) {
      await _clickToolbarButton(
        'cke_button__oppia' + componentName.toLowerCase());

      // The currently active modal is the last in the DOM.
      var modal = await element.all(by.css('.modal-dialog')).last();

      // Need to convert arguments to an actual array; we tell the component
      // which modal to act on but drop the componentName.
      var args = [modal];
      for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      await richTextComponents.getComponent(componentName)
        .customizeComponent.apply(null, args);
      var doneButton = modal.element(
        by.css(
          '.protractor-test-close-rich-text-component-editor'));
      await action.click('Done Button', doneButton);
      await waitFor.invisibilityOf(
        modal, 'Customization modal taking too long to disappear.');
      // Ensure that focus is not on added component once it is added so that
      // the component is not overwritten by some other element.
      if (
        [
          'Video', 'Image', 'Collapsible', 'Tabs', 'Svgdiagram'
        ].includes(componentName)) {
        var firstOppiaRte = elem.all(by.css('.oppia-rte')).first();
        await action.sendKeys(
          'First Rich Text Editor', firstOppiaRte, protractor.Key.DOWN);
      }

      // Ensure that the cursor is at the end of the RTE.
      var firstOppiaRte = elem.all(by.css('.oppia-rte')).first();
      await action.sendKeys(
        'First Rich Text Editor', firstOppiaRte, protractor.Key.chord(
          protractor.Key.CONTROL, protractor.Key.END));
    }
  };
};

// Used to edit entries of a set of HTML strings, specifically used in the item
// selection interaction test to customize interaction details.
var SetOfTranslatableHtmlContentIdsEditor = function(elem) {
  return {
    editEntry: async function(index, objectType) {
      var entry = elem.element(
        await by.repeater('property in propertySchemas()').row(index));
      var editor = getEditor(objectType);
      return await editor(entry);
    }
  };
};

var UnicodeEditor = function(elem) {
  return {
    setValue: async function(text) {
      var unicodeEditorInput = elem.element(by.tagName('input'));
      await action.clear('Unicode Editor Input', unicodeEditorInput);
      await action.sendKeys('Unicode Editor Input', unicodeEditorInput, text);
    }
  };
};

var AutocompleteDropdownEditor = function(elem) {
  return {
    setValue: async function(text) {
      var select2Container = elem.element(by.css('.select2-container'));
      await action.click('Select2 Container', select2Container);
      // NOTE: the input field is top-level in the DOM, and is outside the
      // context of 'elem'. The 'select2-dropdown' id is assigned to the input
      // field when it is 'activated', i.e. when the dropdown is clicked.
      var select2SearchInput = element(
        by.css('.select2-dropdown')).element(by.css('.select2-search input'));
      await action.sendKeys(
        'Select2 Search Input in Dropdown', select2SearchInput, text + '\n');
    },
    expectOptionsToBe: async function(expectedOptions) {
      var select2Container = elem.element(by.css('.select2-container'));
      await action.click('Select2 Container', select2Container);
      var actualOptions = await element(by.css('.select2-dropdown'))
        .all(by.tagName('li')).map(
          async function(optionElem) {
            return await action.getText(
              `Select2 Dropdown Option Element ${optionElem}`, optionElem);
          }
        );
      expect(actualOptions).toEqual(expectedOptions);
      // Re-close the dropdown.
      var select2DropdownSearchInput = element(
        by.css('.select2-dropdown')).element(
        by.css('.select2-search input'));
      await action.sendKeys(
        'Select2 Dropdown Search Input', select2DropdownSearchInput, '\n');
    }
  };
};

var AutocompleteMultiDropdownEditor = function(elem) {
  return {
    setValues: async function(texts) {
      // Clear all existing choices.
      var deleteButtons = await elem.element(
        by.css('.select2-selection__rendered')
      ).all(by.tagName('li')).map(function(choiceElem) {
        return choiceElem.element(
          by.css('.select2-selection__choice__remove'));
      });
      // We iterate in descending order, because clicking on a delete button
      // removes the element from the DOM. We also omit the last element
      // because it is the field for new input.
      for (var i = deleteButtons.length - 2; i >= 0; i--) {
        await action.click(`Delete Button ${i}`, deleteButtons[i]);
      }

      for (var i = 0; i < texts.length; i++) {
        var select2Container = elem.element(by.css('.select2-container'));
        await action.click('Select2 Container', select2Container);
        var select2SearchField = elem.element(by.css('.select2-search__field'));
        await action.sendKeys(
          'Select2 Search Field', select2SearchField, texts[i] + '\n');
      }
    },
    expectCurrentSelectionToBe: async function(expectedCurrentSelection) {
      actualSelection = await elem.element(
        by.css('.select2-selection__rendered')
      ).all(by.tagName('li')).map(async function(choiceElem) {
        return await action.getText(
          `Select2 selection rendered ${choiceElem}`, choiceElem);
      });
      // Remove the element corresponding to the last <li>, which actually
      // corresponds to the field for new input.
      actualSelection.pop();
      expect(actualSelection).toEqual(expectedCurrentSelection);
    }
  };
};

var MultiSelectEditor = function(elem) {
  // This function checks that the options corresponding to the given texts
  // have the expected class name, and then toggles those options accordingly.
  var _toggleElementStatusesAndVerifyExpectedClass = async function(
      texts, expectedClassBeforeToggle) {
    // Open the dropdown menu.
    var SearchBarDropdownToggle = elem.element(by.css(
      '.protractor-test-search-bar-dropdown-toggle'));
    await action.click(
      'Search Bar Dropdown Toggle', SearchBarDropdownToggle);

    var filteredElementsCount = 0;
    for (var i = 0; i < texts.length; i++) {
      var filteredElement = elem.element(
        by.cssContainingText(
          '.protractor-test-search-bar-dropdown-menu span', texts[i]));
      if (await filteredElement.isPresent()) {
        filteredElementsCount += 1;
        expect(await filteredElement.getAttribute('class')).toMatch(
          expectedClassBeforeToggle);
        await action.click('Filtered Element', filteredElement);
      }
    }

    if (filteredElementsCount !== texts.length) {
      throw (
        'Could not toggle element selection. Values requested: ' + texts +
      '. Found ' + filteredElementsCount + ' matching elements.');
    }

    // Close the dropdown menu at the end.
    var SearchBarDropdownToggle = elem.element(by.css(
      '.protractor-test-search-bar-dropdown-toggle'));
    await action.click(
      'Search Bar Dropdown Toggle', SearchBarDropdownToggle);
  };

  return {
    selectValues: async function(texts) {
      await _toggleElementStatusesAndVerifyExpectedClass(
        texts, 'protractor-test-deselected');
    },
    deselectValues: async function(texts) {
      await _toggleElementStatusesAndVerifyExpectedClass(
        texts, 'protractor-test-selected');
    },
    expectCurrentSelectionToBe: async function(expectedCurrentSelection) {
      // Open the dropdown menu.
      var SearchBarDropdownToggle = elem.element(by.css(
        '.protractor-test-search-bar-dropdown-toggle'));
      await action.click(
        'Search Bar Dropdown Toggle', SearchBarDropdownToggle);

      // Find the selected elements.
      var actualSelection = await elem.element(
        by.css('.protractor-test-search-bar-dropdown-menu')
      ).all(by.css('.protractor-test-selected'))
        .map(async function(selectedElem) {
          return await action.getText(
            `Search bar dropdown menu ${selectedElem}`, selectedElem);
        });
      expect(actualSelection).toEqual(expectedCurrentSelection);

      // Close the dropdown menu at the end.
      var SearchBarDropdownToggle = elem.element(by.css(
        '.protractor-test-search-bar-dropdown-toggle'));
      await action.click(
        'Search Bar Dropdown Toggle', SearchBarDropdownToggle);
    }
  };
};

// This function is sent 'elem', which should be the element immediately
// containing the various elements of a rich text area, for example
// <div>
//   plain
//   <b>bold</b>
//   <oppia-noninteractive-math> ... </oppia-noninteractive-math>
// <div>
// The richTextInstructions function will be supplied with a 'handler' argument
// which it should then use to read through the rich-text area using the
// functions supplied by the RichTextChecker below. In the example above
// richTextInstructions should consist of:
//   handler.readPlainText('plain');
//   handler.readBoldText('bold');
//   handler.readRteComponent('Math', ...);
var expectRichText = function(elem) {
  var toMatch = async function(richTextInstructions) {
    // TODO(#9821): Find a better way to parse through the tags rather than
    // using xpath.
    // We select all top-level non-paragraph elements, as well as all children
    // of paragraph elements. (Note that it is possible for <p> elements to
    // surround, e.g., <i> tags, so we can't just ignore the <p> elements
    // altogether.)
    var XPATH_SELECTOR = './p/*|./*[not(self::p)]';
    var arrayOfTexts = await elem.all(by.xpath(XPATH_SELECTOR))
      .map(async function(entry) {
        // It is necessary to obtain the texts of the elements in advance since
        // applying .getText() while the RichTextChecker is running would be
        // asynchronous and so not allow us to update the textPointer
        // synchronously.
        return await action.getText(
          `${entry} in Array of texts in Rich Text Area`, entry);
      });
    // We re-derive the array of elements as we need it too.
    var arrayOfElements = elem.all(by.xpath(XPATH_SELECTOR));
    var fullText = await action.getText('Elements of Rich Text Area', elem);
    var checker = await RichTextChecker(
      arrayOfElements, arrayOfTexts, fullText);
    await richTextInstructions(checker);
    await checker.expectEnd();
  };
  return {
    toMatch: toMatch,
    toEqual: async function(text) {
      await toMatch(async function(checker) {
        await checker.readPlainText(text);
      });
    }
  };
};

// This supplies functions to verify the contents of an area of the page that
// was created using a rich-text editor, e.g. <div>text<b>bold</b></div>.
// 'arrayOfElems': the array of promises of top-level element nodes in the
//   rich-text area, e.g [promise of <b>bold</b>].
// 'arrayOfTexts': the array of visible texts of top-level element nodes in
//   the rich-text area, obtained from getText(), e.g. ['bold'].
// 'fullText': a string consisting of all the visible text in the rich text
//   area (including both element and text nodes, so more than just the
//   concatenation of arrayOfTexts), e.g. 'textbold'.
var RichTextChecker = async function(arrayOfElems, arrayOfTexts, fullText) {
  expect(await arrayOfElems.count()).toEqual(arrayOfTexts.length);
  // These are shared by the returned functions, and records how far through
  // the child elements and text of the rich text area checking has gone. The
  // arrayPointer traverses both arrays simultaneously.
  var arrayPointer = 0;
  var textPointer = 0;
  // RTE components insert line breaks above and below themselves and these are
  // recorded in fullText but not arrayOfTexts so we need to track them
  // specially.
  var justPassedRteComponent = false;

  var _readFormattedText = async function(text, tagName) {
    expect(
      await (await arrayOfElems.get(arrayPointer)).getTagName()
    ).toBe(tagName);
    expect(
      await (await arrayOfElems.get(arrayPointer)).getAttribute('innerHTML')
    ).toBe(text);
    expect(arrayOfTexts[arrayPointer]).toEqual(text);
    arrayPointer = arrayPointer + 1;
    textPointer = textPointer + text.length;
    justPassedRteComponent = false;
  };

  return {
    readPlainText: function(text) {
      // Plain text is in a text node so not recorded in either array.
      expect(
        fullText.substring(textPointer, textPointer + text.length)
      ).toEqual(text);
      textPointer = textPointer + text.length;
      justPassedRteComponent = false;
    },
    readBoldText: async function(text) {
      await _readFormattedText(text, 'strong');
    },
    readItalicText: async function(text) {
      await _readFormattedText(text, 'em');
    },
    // TODO(Jacob): Add functions for other rich text components.
    // Additional arguments may be sent to this function, and they will be
    // passed on to the relevant RTE component editor.
    readRteComponent: async function(componentName) {
      var elem = await arrayOfElems.get(arrayPointer);
      expect(await elem.getTagName()).
        toBe('oppia-noninteractive-' + componentName.toLowerCase());
      // Need to convert arguments to an actual array; we tell the component
      // which element to act on but drop the componentName.
      var args = [elem];
      for (var i = 1; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      expect(
        await action.getText(
          `${elem} in Array of Elements in Rich Text Area`, elem))
        .toBe(arrayOfTexts[arrayPointer]);

      await richTextComponents.getComponent(componentName).
        expectComponentDetailsToMatch.apply(null, args);
      textPointer = textPointer + arrayOfTexts[arrayPointer].length +
        (justPassedRteComponent ? 1 : 2);
      arrayPointer = arrayPointer + 1;
      justPassedRteComponent = true;
    },
    expectEnd: async function() {
      expect(arrayPointer).toBe(await arrayOfElems.count());
    }
  };
};

// This converts a string into a function that represents rich text, which can
// then be sent to either editRichText() or expectRichText(). The string should
// not contain any html formatting. In the first case the function created will
// write the given text into the rich text editor (as plain text), and in
// the second it will verify that the html created by a rich text editor
// consists of the given text (without any formatting).
//   This is necessary because the Protractor tests do not have an abstract
// representation of a 'rich text object'. This is because we are more
// interested in the process of interacting with the page than in the
// information thereby conveyed.
var toRichText = async function(text) {
  // The 'handler' should be either a RichTextEditor or RichTextChecker.
  return async function(handler) {
    if (handler.hasOwnProperty('setPlainText')) {
      await handler.setPlainText(text);
    } else {
      await handler.readPlainText(text);
    }
  };
};

/**
 * This function is used to read and check CodeMirror.
 * The input 'elem' is the div with the 'CodeMirror-code' class.
 * This assumes that line numbers are enabled, as line numbers are used to
 * identify lines.
 * CodeMirror loads a part of the text at once, and scrolling in the element
 * loads more divs.
 */
var CodeMirrorChecker = function(elem, codeMirrorPaneToScroll) {
  // The number of lines to scroll between reading different sections of
  // CodeMirror's text.
  var NUMBER_OF_LINES_TO_SCROLL = 15;

  /**
   * This recursive function is used by expectTextWithHighlightingToBe().
   * currentLineNumber is the current largest line number processed,
   * scrollTo is the number of pixels from the top of the text that
   * codemirror should scroll to,
   * codeMirrorPaneToScroll specifies the CodeMirror's left or right pane
   * which is to be scrolled.
   * compareDict is an object whose keys are line numbers and whose values are
   * objects corresponding to that line with the following key-value pairs:
   *  - 'text': the exact string of text expected on that line
   *  - 'highlighted': true or false, whether the line is highlighted
   *  - 'checked': true or false, whether the line has been checked
   * compareHightlighting: Whether highlighting should be compared.
   */
  var _compareText = async function(compareDict, compareHightlighting) {
    var scrollTo = 0;
    var prevScrollTop = -1;
    var actualDiffDict = {};
    var scrollBarElements = element.all(by.css('.CodeMirror-vscrollbar'));
    var scrollBarWebElement = null;
    if (codeMirrorPaneToScroll === 'first') {
      scrollBarWebElement = await scrollBarElements.first().getWebElement();
    } else {
      scrollBarWebElement = await scrollBarElements.last().getWebElement();
    }
    while (true) {
      // This is used to match and scroll the text in codemirror to a point
      // scrollTo pixels from the top of the text or the bottom of the text
      // if scrollTo is too large.
      await browser.executeScript(
        '$(\'.CodeMirror-vscrollbar\').' + codeMirrorPaneToScroll +
        '().scrollTop(' + String(scrollTo) + ');');
      var lineHeight = await elem.element(
        by.css('.CodeMirror-linenumber')).getAttribute('clientHeight');
      var currentScrollTop = await browser.executeScript(
        'return arguments[0].scrollTop;', scrollBarWebElement);
      if (currentScrollTop === prevScrollTop) {
        break;
      } else {
        prevScrollTop = currentScrollTop;
      }
      var lineDivElements = elem.all(by.xpath('./div'));
      var lineContentElements = elem.all(by.css('.CodeMirror-line'));
      var lineNumberElements = elem.all(by.css('.CodeMirror-linenumber'));
      var totalCount = await lineNumberElements.count();
      for (var i = 0; i < totalCount; i++) {
        var lineNumberElement = await lineNumberElements.get(i);
        var lineNumber = await action.getText(
          `Line number elements at ${i}`, lineNumberElement);
        if (lineNumber && !compareDict.hasOwnProperty(lineNumber)) {
          throw new Error('Line ' + lineNumber + ' not found in CodeMirror');
        }
        var lineDivElement = await lineDivElements.get(i);
        var lineElement = await lineContentElements.get(i);
        var isHighlighted = await lineDivElement.element(
          by.css('.CodeMirror-linebackground')).isPresent();
        var text = await action.getText(
          `CodeMirror Line element at ${lineNumber}`, lineElement);
        actualDiffDict[lineNumber] = {
          text: text,
          highlighted: isHighlighted
        };
      }
      scrollTo = scrollTo + lineHeight * NUMBER_OF_LINES_TO_SCROLL;
    }
    for (var lineNumber in compareDict) {
      expect(actualDiffDict[lineNumber].text).toEqual(
        compareDict[lineNumber].text);
      if (compareHightlighting) {
        expect(actualDiffDict[lineNumber].highlighted).toEqual(
          compareDict[lineNumber].highlighted);
      }
    }
  };

  return {
    /**
     * Compares text and highlighting with codemirror-mergeview. The input
     * should be an object whose keys are line numbers and whose values should
     * be an object with the following key-value pairs:
     *  - text: the exact string of text expected on that line
     *  - highlighted: true or false
     * This runs much slower than checking without highlighting, so the
     * expectTextToBe() function should be used when possible.
     */
    expectTextWithHighlightingToBe: async function(expectedTextDict) {
      for (var lineNumber in expectedTextDict) {
        expectedTextDict[lineNumber].checked = false;
      }
      await _compareText(expectedTextDict, true);
    },
    /**
     * Compares text with codemirror. The input should be a string (with
     * line breaks) of the expected display on codemirror.
     */
    expectTextToBe: async function(expectedTextString) {
      var expectedTextArray = expectedTextString.split('\n');
      var expectedDict = {};
      for (var lineNumber = 1; lineNumber <= expectedTextArray.length;
        lineNumber++) {
        expectedDict[lineNumber] = {
          text: expectedTextArray[lineNumber - 1],
          checked: false
        };
      }
      await _compareText(expectedDict, false);
    }
  };
};

var CodeStringEditor = function(elem) {
  return {
    setValue: async function(code) {
      var codeStringEditorInput = elem.element(by.tagName('input'));
      await action.clear('Code String Editor Input', codeStringEditorInput);
      await action.sendKeys(
        'Code String Editor Input', codeStringEditorInput, code);
    }
  };
};

// This is used by the list and dictionary editors to retrieve the editors of
// their entries dynamically.
var FORM_EDITORS = {
  CodeString: CodeStringEditor,
  Dictionary: DictionaryEditor,
  Graph: GraphEditor,
  List: ListEditor,
  Real: RealEditor,
  RichText: RichTextEditor,
  SetOfTranslatableHtmlContentIds: SetOfTranslatableHtmlContentIdsEditor,
  Unicode: UnicodeEditor
};

var getEditor = function(formName) {
  if (FORM_EDITORS.hasOwnProperty(formName)) {
    return FORM_EDITORS[formName];
  } else if (objects.OBJECT_EDITORS.hasOwnProperty(formName)) {
    return objects.OBJECT_EDITORS[formName];
  } else {
    throw new Error('Unknown form / object requested: ' + formName);
  }
};

exports.CodeStringEditor = CodeStringEditor;
exports.DictionaryEditor = DictionaryEditor;
exports.ListEditor = ListEditor;
exports.RealEditor = RealEditor;
exports.RichTextEditor = RichTextEditor;
exports.SetOfTranslatableHtmlContentIdsEditor = (
  SetOfTranslatableHtmlContentIdsEditor);
exports.UnicodeEditor = UnicodeEditor;
exports.AutocompleteDropdownEditor = AutocompleteDropdownEditor;
exports.AutocompleteMultiDropdownEditor = AutocompleteMultiDropdownEditor;
exports.MultiSelectEditor = MultiSelectEditor;
exports.GraphEditor = GraphEditor;

exports.expectRichText = expectRichText;
exports.RichTextChecker = RichTextChecker;
exports.toRichText = toRichText;
exports.CodeMirrorChecker = CodeMirrorChecker;

exports.getEditor = getEditor;
