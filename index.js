(function (){
  let assessmentOptions = null
  let assessment = null
  let processing = false
  let currentData = null
  const taskId = location.hash.substring(1)

  const RANDOM_SEED = 'seed'

  const getInitialValue = () => {
    const {result, state} = currentData || {}
    const {useSubmitButtons, isDisabled} = assessmentOptions
    const answered = result?.state && result.state !== window.codioAssessmentsHelper.States.RESET
    const draft = state?.active

    if (!answered) {
      return draft
    }

    const canAnswerAgain = window.codioAssessmentsHelper.isCanAnswerAgain(assessment, result)
    if (!isDisabled && !useSubmitButtons && canAnswerAgain && draft) {
      return draft
    }
    return result.current
  }

  const applyStateInitial = (data) => {
    const {state, result, ...dataWithoutState} = data
    assessment = dataWithoutState.assessment
    assessmentOptions = dataWithoutState.options

    render()
  }

  const handleEnter = (callback, event) => {
    const key = event.which || event.keyCode
    if (key === 13) {
      callback(event)
    }
  }

  const onClick = (id) => {
    $(`#${id}`).click()
  }

  const getAnswerIcon = (ok, wrong) => {
    if (!ok && !wrong) {
      return null
    }
    const baseClass = 'codio-assessment-mcq-answer-icon'
    const classes = [baseClass]
    ok && classes.push(`${baseClass}-ok`)
    wrong && classes.push(`${baseClass}-wrong`)
    const iconContainer = $(`<div class="${classes.join(' ')}"></div>`)
    const {FAILED, PASSED} = window.codioAssessmentsHelper.RESULT_STATUS
    const icon = $(window.codioAssessmentsHelper.getIconByResultStatus(ok ? PASSED : FAILED))
    iconContainer.append(icon)
    return iconContainer
  }

  const renderAnswers = () => {
    const answersBlock = $('.codio-assessment-answers')

    const {isRandomized, multipleResponse} = assessment.source.settings
    let answers = assessment.source.settings.answers
    if (isRandomized) {
      const projectId = assessmentOptions.eduStartedAssignment?.started?.projectId
      answers = window.multipleChoiceAssessment.shuffle(answers, `${projectId || RANDOM_SEED}-${taskId}`)
    }

    const inputType = multipleResponse ? 'checkbox' : 'radio'

    answers.forEach((answer) => {
      const id = answer._id

      const classes = [`codio-assessment-mcq-answer codio-assessment-mcq-answer-${inputType}`]

      const answerEl = $(`<div class="${classes.join(' ')}"></div>`)
      const inputEl = $(`<input id="${id}" type="${inputType}" name="${taskId}" value="${id}" class="codio-assessment-mcq-answer-input visuallyhidden" />`)
      answerEl.append(inputEl)
      const labelEl = $(`<label for="${id}" class="codio-assessment-mcq-answer-input-label"></label>`)
      labelEl.on('keydown', handleEnter.bind(null, onClick.bind(null, id)))
      const inputIndicatorEl = $('<div class="codio-assessment-mcq-answer-input-indicator"></div>')
      labelEl.append(inputIndicatorEl)
      const answerTextEl = $(`<div class="codio-assessment-mcq-answer-text"></div>`).html(answer.answer)
      labelEl.append(answerTextEl)
      answerEl.append(labelEl)
      answersBlock.append(answerEl)
    })
  }

  const updateAnswers = (initialValue) => {
    const assessmentState = getAssessmentState()
    const valueFromState = initialValue || getValue()
    let value = valueFromState
    if (assessment.source.settings.multipleResponse && !Array.isArray(valueFromState)) {
      value = value ? [value] : []
    }

    const disableResponse = assessmentOptions.isDisabled || assessmentOptions.showUnblock || assessmentState.answered &&
      (!assessmentState.canAnswerAgain || assessmentState.answerFullyCorrect)
    const showExpectedAnswer = window.codioAssessmentsHelper.calculateShowExpectedAnswer(
      assessmentOptions.eduStartedAssignment,
      assessment.source.showExpectedAnswerOption
    )
    const {result} = currentData || {}
    const showAnswer = assessmentState.showAsTeacher || showExpectedAnswer
    const expectedAnswer = result && showAnswer && (result.right || assessment.source.expectedAnswerIds)

    const answerEls = $('.codio-assessment-mcq-answer')
    answerEls.each((index, answerElRaw) => {
      const answerEl = $(answerElRaw)
      const inputEl = answerEl.find('.codio-assessment-mcq-answer-input')
      const id = inputEl.val()
      let ok, wrong
      if (disableResponse && expectedAnswer) {
        ok = expectedAnswer.includes(id)
        if (Array.isArray(expectedAnswer) && expectedAnswer.length > 0) {
          wrong = !ok
        }
      }

      let checked = Array.isArray(value) ? value.includes(id) : value === id

      answerEl.removeClass('codio-assessment-mcq-answer-ok codio-assessment-mcq-answer-wrong')
      inputEl.prop('checked', checked)
      inputEl.prop('disabled', disableResponse)

      const inputIndicatorEl = answerEl.find('.codio-assessment-mcq-answer-input-indicator')
      inputIndicatorEl.empty()
      const icon = disableResponse ? getAnswerIcon(ok, wrong) : null
      icon && inputIndicatorEl.append(icon)
    })
  }

  const applyState = (data) => {
    console.log('assessment iframe applyState', data)
    currentData = data
    if (!assessment) {
      applyStateInitial(data)
      return
    }
    updateCheckButtonText()
    updateAnswersAndFooter()
    renderGuidance()
  }

  const getValue = () => {
    const value = $('.codio-assessment-mcq-answer input:checked').map((_, el) => el.value).get()
    const {multipleResponse} = assessment.source.settings
    return !multipleResponse ? value[0] : value
  }

  const onCheck = (event) => {
    event.preventDefault()
    processing = true
    updateAnswersAndFooter()

    window.codioAssessmentsHelper.send(
      window.codioAssessmentsHelper.METHODS.SUBMIT_ANSWER,
      {result: {action: getValue()}}
    )
  }

  const onUnblock = (event) => {
    event.preventDefault()
    codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.UNBLOCK)
  }

  const onReset = (event) => {
    event.preventDefault()
    codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.RESET)
  }

  const renderContent = () => {
    $('.instructions-text').html(assessment.source.settings.instructions)
  }

  const updateVisibility = (el, visible) => {
    visible ? el.removeClass('hide') : el.addClass('hide')
  }

  const updateFooterButtons = () => {
    const assessmentState = getAssessmentState()
    const {teacherInStudentsProject, showModify, isDisabled, canAnswerAgain, answered} = assessmentState

    const checkVisibility = !showModify && assessmentOptions.useSubmitButtons
    const checkBtn = $('.check-button')
    updateVisibility(checkBtn, checkVisibility)
    checkBtn.prop('disabled', isDisabled)

    const unblockVisibility = !teacherInStudentsProject && showModify
    updateVisibility($('.unblock-button'), unblockVisibility)

    const resetVisibility = !showModify && answered && assessmentOptions.owner &&
      !processing && (!canAnswerAgain || assessmentState.answerFullyCorrect)
    updateVisibility($('.reset-button'), resetVisibility)
  }

  const updateCheckButtonText = () => {
    const footerContainer = $('.codio-assessment-footer')
    const {result} = currentData || {}
    const caption = window.codioAssessmentsHelper.getButtonCaption(
      assessmentOptions,
      assessment.source.maxAttemptsCount,
      result?.usedAttempts || 0
    )
    footerContainer.find('.check-button').html(caption)
  }

  const renderGuidance = () => {
    const guidanceBlock = $('.codio-assessment-guidance-block')
    guidanceBlock.empty()
    const assessmentState = getAssessmentState()
    const {result} = currentData || {}
    const guidance = window.codioAssessmentsHelper.calculateGuidance(
      !assessmentOptions.eduStartedAssignment,
      assessmentOptions.showAsTeacher,
      assessmentState.answered,
      assessment.source,
      result ?
        {
          answerGuidance: result.guidance,
          answerPoints: result.points,
          attemptsCount: result.usedAttempts,
          passed: assessmentState.answerFullyCorrect,
          isCompletedAndReleased: window.codioAssessmentsHelper.calculateCompletedAndReleased(
            assessmentOptions.eduStartedAssignment
          )
        } : {}
    )
    if (guidance) {
      const guidanceContainer = $('<div class="codio-assessment-guidance-container" />')
      const guidanceText = $('<div class="codio-assessment-guidance-text">').html(guidance)
      guidanceContainer.append(guidanceText)
      guidanceBlock.append(guidanceContainer)
    }
  }

  const isAnswerFullyCorrect = (result) => {
    if (!result?.right || result.right.length === 0) {
      return false
    }
    if (assessment.source.points === 0) {
      return result.right.sort().join('_') === result.current.sort().join('_')
    }
    return result.state === window.codioAssessmentsHelper.States.PASS && assessment.source.points === result.points
  }

  const isSomethingChecked = () => {
    return !!$('.codio-assessment-mcq-answer input:checked').length
  }

  const getAssessmentState = () => {
    const result = currentData ? currentData.result : null
    const answered = result?.state && result.state !== window.codioAssessmentsHelper.States.RESET
    const answerFullyCorrect = answered && isAnswerFullyCorrect(result, assessment.source)
    const usedAttempts = result?.usedAttempts
    const canAnswerAgain = !assessment.source.maxAttemptsCount || usedAttempts < assessment.source.maxAttemptsCount
    const isDisabled = assessmentOptions.isDisabled || processing || !isSomethingChecked() ||
      answered && (!canAnswerAgain || answerFullyCorrect)
    const showModify = assessmentOptions.showUnblock && !answered
    const teacherInStudentsProject = assessmentOptions.showAsTeacher && !assessmentOptions.owner

    return {
      isDisabled,
      answered,
      usedAttempts,
      canAnswerAgain,
      showModify,
      teacherInStudentsProject,
      answerFullyCorrect
    }
  }

  const updateAnswersAndFooter = () => {
    if (!assessment) {
      return
    }
    // processing, new state/results
    updateAnswers()
    updateFooterButtons()
  }

  const onInputChange = () => {
    updateFooterButtons()
    window.codioAssessmentsHelper.send(
      window.codioAssessmentsHelper.METHODS.SET_STATE, {state: {active: getValue()}}
    )
  }

  const bindEvents = () => {
    $('.check-button').on('click', onCheck)
    $('.unblock-button').on('click', onUnblock)
    $('.reset-button').on('click', onReset)
    $('.codio-assessment-mcq-answer input').on('change', onInputChange)

    window.codioAssessmentsHelper.addBodyHeightListener()
  }

  const render = () => {
    const container = $('.codio-assessment')
    const nameEl = container.find('.codio-assessment-name')
    assessment.source.showName ? nameEl.text(assessment.source.name) : nameEl.remove()
    renderContent()
    updateCheckButtonText()
    renderGuidance()
    renderAnswers()
    updateAnswers(getInitialValue())
    updateFooterButtons()
    bindEvents()
    container.removeClass('hide')
  }

  const processMessage = (jsonData) => {
    try {
      const {method, data} = JSON.parse(jsonData)
      console.log('assessment iframe processMessage', jsonData, method, data)
      switch (method) {
        case window.codioAssessmentsHelper.METHODS.GET_STYLES_RESPONSE:
          window.codioAssessmentsHelper.addStyle(data.css)
          break
        case window.codioAssessmentsHelper.METHODS.GET_STATE_RESPONSE:
          processing = false
          applyState(data)
          break
        case window.codioAssessmentsHelper.METHODS.CALLBACK: {
          window.codioAssessmentsHelper.processCallback(data)
          break
        }
      }
    } catch (e) { console.error(e) }
  }

  window.addEventListener('load', () => {
    window.codioAssessmentsHelper.registerMessageListener(processMessage)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_STATE)
    window.codioAssessmentsHelper.send(window.codioAssessmentsHelper.METHODS.GET_STYLES)
  })
})()
