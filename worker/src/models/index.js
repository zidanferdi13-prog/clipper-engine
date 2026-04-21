const mongoose = require('mongoose');

const Job = mongoose.model('Job', new mongoose.Schema({}, { strict: false }));
const Clip = mongoose.model('Clip', new mongoose.Schema({}, { strict: false }));
const UsageLog = mongoose.model('UsageLog', new mongoose.Schema({}, { strict: false }));

module.exports = {
  Job,
  Clip,
  UsageLog
};
