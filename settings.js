(function () {
  const ICONS = {
    UP: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M14 20h-4v-9l-3.5 3.5l-2.42-2.42L12 4.16l7.92 7.92l-2.42 2.42L14 11z"/></svg>',
    DOWN: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M10 4h4v9l3.5-3.5l2.42 2.42L12 19.84l-7.92-7.92L6.5 9.5L10 13z"/></svg>',
    DELETE: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM8 9h8v10H8zm7.5-5l-1-1h-5l-1 1H5v2h14V4z"/></svg>'
  }

  const ACTION_CLASS = {
    UP: 'action-up',
    DOWN: 'action-down',
    DELETE: 'action-delete',
  }

  let multipleResponse = false

  const getId = () => window.codioAssessmentsHelper.GUID()

  const collectSettings = () => {
    const instructions = $('#instructions').val()
    const multipleResponse = $('#multiple-response').is(':checked')
    const shuffleAnswers = $('#shuffle-answers').is(':checked')
    const answers = []
    $('.answer-item').each(function (index, item) {
      const $item = $(item)
      const answerId = $item.data('answer-id') || getId()
      const answer = $item.find('.answer-item-answer-ta').val()
      const correct = $item.find('[name="correct"]').is(':checked')
      answers.push({_id: answerId, answer, correct})
    })

    return {instructions, multipleResponse, shuffleAnswers, answers};
  }

  const exportSettings = () => {
    const data = collectSettings();
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.EXPORT_SETTINGS_RESPONSE, data);
  }

  const applySettings = (settings = {}) => {
    multipleResponse = !!settings.multipleResponse
    $('#instructions').val(settings.instructions || '');
    $('#multiple-response').prop('checked', settings.multipleResponse);
    $('#shuffle-answers').prop('checked', settings.shuffleAnswers);
    const answers = settings.answers || []
    answers.forEach((item) => {
      addAnswer(item);
    })
  }

  const processMessage = (jsonData) => {
    console.log('settings iframe processMessage', jsonData)
    try {
      const {method, data} = JSON.parse(jsonData);
      switch (method) {
        case window.codioAssessmentsHelper.METHODS.EXPORT_SETTINGS:
          exportSettings();
          break;
        case window.codioAssessmentsHelper.METHODS.GET_SETTINGS_RESPONSE:
          applySettings(data.settings);
          break;
      }
    } catch {}
  }

  const renderToggle = (id, name, value) => {
    const labelEl = $('<label class="codio-assessment-settings-form-toggle-switch"></label>');
    const inputEl = $(`<input type="checkbox" name="${name}" id="${id}" ${value ? 'checked' : ''}>`)
    const sliderEl = $('<span class="codio-assessment-settings-form-toggle-slider"></span>')
    labelEl.append(inputEl)
    labelEl.append(sliderEl)
    return labelEl
  }

  const renderRadio = (id, name, value) => {
    const labelEl = $('<div class="codio-assessment-settings-form-radio"></div>');
    const inputEl = $(`<input type="radio" name="${name}" id="${id}" ${value ? 'checked' : ''}>`)
    return labelEl.append(inputEl)
  }

  const renderCorrectControl = (id, value) => {
    const name = 'correct'
    const inputContainer = $('<div class="answer-item-correct-input-container"></div>')
    const input = multipleResponse ? renderToggle(id, name, value) : renderRadio(id, name, value)
    return inputContainer.append(input)
  }

  const refreshCorrectControls = () => {
    const items = $('.answer-item')
    const firstCorrect = items.find('input[name="correct"]:checked').closest('.answer-item').first()
    const firstCorrectIndex = items.index(firstCorrect)
    items.each((index, element) => {
      const $el = $(element)
      const correctContainer = $el.find('.answer-item-correct-container')
      $el.find('.answer-item-correct-input-container').remove()
      correctContainer.append(renderCorrectControl(getId(), index === firstCorrectIndex))
    })
  }

  const renderIconButton = (className, icon, title) => {
    return $(`<button type="button" title="${title}" aria-label="title" class="answer-item-action-button ${className}">
${icon}
</button>`)
  }

  const addAnswer = (data) => {
    const listContainer = $('.answer-list')
    const answerItem = $('<div class="answer-item"></div>')
    const itemActionsContainer = $('<div class="answer-item-actions"></div>')
    itemActionsContainer.append(renderIconButton(ACTION_CLASS.UP, ICONS.UP, 'Move up'))
    itemActionsContainer.append(renderIconButton(ACTION_CLASS.DELETE, ICONS.DELETE, 'Delete'))
    itemActionsContainer.append(renderIconButton(ACTION_CLASS.DOWN, ICONS.DOWN, 'Move down'))
    const correctContainer = $('<div class="answer-item-correct-container"></div>')
    const id = getId()
    correctContainer.append(`<label class="codio-assessment-settings-form-label" for="${id}">Correct</label>`)
    correctContainer.append(renderCorrectControl(id, false))
    const answerContainer = $('<div class="answer-item-answer-container codio-assessment-settings-form-input-container"></div>')
    const taId = getId()
    answerContainer.append(`<label class="codio-assessment-settings-form-label" for="${taId}">Answer</label>`)
    const answerTa = $(`<textarea class="answer-item-answer-ta codio-assessment-settings-form-input" id="${taId}" rows="3"></textarea>`)
    answerContainer.append(answerTa)
    answerItem.append(itemActionsContainer)
    answerItem.append(correctContainer)
    answerItem.append(answerContainer)

    if (data) {
      data?._id && answerItem.data('answer-id', data._id)
      data.correct && answerItem.find('[name="correct"]').prop('checked', true)
      data.answer && answerItem.find('.answer-item-answer-ta').val(data.answer)
    }
    listContainer.append(answerItem)
  }

  const updateActionButtonStates = () => {
    const items = $('.answer-item')
    items.find(`.${ACTION_CLASS.UP}`).prop('disabled', false)
    items.find(`.${ACTION_CLASS.DOWN}`).prop('disabled', false)
    items.first().find(`.${ACTION_CLASS.UP}`).prop('disabled', true)
    items.last().find(`.${ACTION_CLASS.DOWN}`).prop('disabled', true)
  }

  const onActionUp = (e) => {
    const element = $(e.currentTarget).closest('.answer-item')
    const prev = element.prev()

    if (!prev?.length) {
      return
    }
    element.insertBefore(prev);
    updateActionButtonStates()
  }

  const onActionDown = (e) => {
    const element = $(e.currentTarget).closest('.answer-item')
    const next = element.next()
    if (!next?.length) {
      return
    }
    element.insertAfter(next);
    updateActionButtonStates()
  }

  const onActionDelete = (e) => {
    const element = $(e.currentTarget).closest('.answer-item')
    element.remove()
    updateActionButtonStates()
  }

  const bindEvents = () => {
    const settingsEl = $('#settings-content')
    settingsEl.on('click', '#add-answer', () => {
      addAnswer()
      updateActionButtonStates()
    })
    settingsEl.on('change', '#multiple-response', function() {
      multipleResponse = this.checked
      refreshCorrectControls()
    })
    settingsEl.on('click', '.action-up', onActionUp)
    settingsEl.on('click', '.action-down', onActionDown)
    settingsEl.on('click', '.action-delete', onActionDelete)
  }

  const onLoad = async () => {
    window.codioAssessmentsHelper.registerMessageListener(processMessage)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_SETTINGS)

    bindEvents()
  }

  window.addEventListener('load', onLoad);
})()
