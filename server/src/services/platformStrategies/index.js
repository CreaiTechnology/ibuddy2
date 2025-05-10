const whatsapp = require('./whatsapp');
const messenger = require('./messenger');
const shopee = require('./shopee');
const lazada = require('./lazada');
const telegram = require('./telegram');
const gmail = require('./gmail');
const facebook = require('./facebook');
const instagram = require('./instagram');
const xiaohongshu = require('./xiaohongshu');

// Export all platform strategies
module.exports = {
  whatsapp,
  messenger,
  shopee,
  lazada,
  telegram,
  gmail,
  facebook,
  instagram,
  xiaohongshu
}; 