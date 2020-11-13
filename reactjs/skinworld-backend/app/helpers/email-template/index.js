const HTMLing = require("htmling");
const errorMaker = require("../error-maker");
const { emailTemplateTypes } = require("../../constants");

module.exports = function(template) {
  const templateDir = "app/helpers/email-template/templates";
  let templateBody = "";
  const defaultData = {
    __year: new Date().getYear() + 1900
  };

  switch (template.type) {
    case emailTemplateTypes.Text:
      templateBody = template.body;
      break;

    case emailTemplateTypes.Html:
      templateBody = HTMLing.file(`${templateDir}/${template.name}.html`)
        .render({
          ...template.data,
          ...defaultData
        });
      break;

    default:
      templateFileName = "";
  }

  const body = {
    personalizations: [{
      to: template.recipients,
      subject: template.subject,
      custom_args: {
        source_action: template.source || 'none',
      },
    }],
    from: template.sender,
    content: [{
      type: 'text/html',
      value: templateBody,
    }],
  };

  if (!template.sender || !template.recipients) {
    throw errorMaker(null, "Email sender or recipient is missing.");
  } else if (!(template.recipients instanceof Array)) {
    throw errorMaker(null, "Email recipients type must be array.");
  } else {
    return body;
  }
};
