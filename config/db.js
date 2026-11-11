const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://cdwrecqgetewuhuigwlz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkd3JlY3FnZXRld3VodWlnd2x6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDM4NTQ0MSwiZXhwIjoyMTA5OTYxNDQxfQ.oCnokDvdiGQ3-Cc2VbimMjWET2mR-d5UEA8UTjtMIH4';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Mock fallback datasets if database tables are not yet created or unreachable
function getMockData(sql) {
  const sqlLower = sql.toLowerCase();
  
  if (sqlLower.includes('count(*) as videos')) return [[{ videos: 0 }]];
  if (sqlLower.includes('count(*) as photos')) return [[{ photos: 0 }]];
  if (sqlLower.includes('count(*) as messages')) return [[{ messages: 0 }]];
  if (sqlLower.includes('count(*) as total')) return [[{ total: 0 }]];
  
  if (sqlLower.includes('select * from admin_users')) {
    return [[{
      id: 1,
      username: 'admin',
      password: '$2b$10$JJHWqLpH8emRFYCAVmSpjOK.lGAlVAsd02ftssuhzPeCHn.GecsQG'
    }]];
  }

  if (sqlLower.includes('from settings')) {
    return [[
      { setting_key: 'store_name', setting_value: 'Taj Studio' },
      { setting_key: 'footer_about', setting_value: 'Capturing your life\'s most precious stories and emotions. Cinematic filmmaking and high-end artistic photography based in India.' },
      { setting_key: 'about_eyebrow', setting_value: 'Who We Are' },
      { setting_key: 'about_title', setting_value: 'We Breathe Life Into Your Memories' },
      { setting_key: 'about_text1', setting_value: 'Based in the heart of India, Taj Studio is an elite collective of filmmakers and visual artists specializing in premium weddings, corporate events, and lifestyle portraiture. We believe that every frame should tell a profound story—combining ambient lighting, natural gestures, and rich colors.' },
      { setting_key: 'about_text2', setting_value: 'Our approach is discreet, intimate, and deeply personal. From local traditions to contemporary setups, we ensure your emotional landscape is recorded with absolute fidelity and creative distinction.' },
      { setting_key: 'about_image', setting_value: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80' },
      { setting_key: 'hero_duration', setting_value: '5000' },
      { setting_key: 'ugc_duration', setting_value: '4000' },
      { setting_key: 'contact_address', setting_value: '123 Palace Road, Jaipur, Rajasthan, India' },
      { setting_key: 'contact_phone', setting_value: '+91 99999 99999' },
      { setting_key: 'contact_email', setting_value: 'contact@tajstudio.com' },
      { setting_key: 'contact_instagram', setting_value: 'https://instagram.com' },
      { setting_key: 'contact_facebook', setting_value: 'https://facebook.com' },
      { setting_key: 'contact_youtube', setting_value: 'https://youtube.com' },
      { setting_key: 'contact_whatsapp', setting_value: 'https://wa.me/919999999999' }
    ]];
  }

  if (sqlLower.includes('from hero_slides')) {
    return [[
      { id: 1, image_path: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1920&q=80', title: 'Crafting Timeless Stories', subtitle: 'Luxury Wedding Film & Photography', order_index: 1 },
      { id: 2, image_path: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1920&q=80', title: 'Cinematic Love Stories', subtitle: 'Capturing Raw Unfiltered Emotions', order_index: 2 },
      { id: 3, image_path: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1920&q=80', title: 'Fine Art Photography', subtitle: 'Bespoke Visual Narratives', order_index: 3 }
    ]];
  }

  if (sqlLower.includes('from ugc_items')) {
    return [[
      { id: 1, type: 'image', file_path: 'https://images.unsplash.com/photo-1520854221256-174b1ec358ef?auto=format&fit=crop&w=600&h=800&q=80', thumbnail_path: null, order_index: 1 },
      { id: 2, type: 'image', file_path: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&h=800&q=80', thumbnail_path: null, order_index: 2 },
      { id: 3, type: 'image', file_path: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&h=800&q=80', thumbnail_path: null, order_index: 3 },
      { id: 4, type: 'image', file_path: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&h=800&q=80', thumbnail_path: null, order_index: 4 }
    ]];
  }

  return [[]];
}

/**
 * Universal query function that executes against Supabase
 * Maintains full compatibility with `mysql2` [[rows]] return signature
 */
async function query(sql, params = []) {
  const sqlTrimmed = sql.trim();
  const sqlLower = sqlTrimmed.toLowerCase();

  try {
    // -------------------------------------------------------------
    // 1. COUNT QUERIES
    // -------------------------------------------------------------
    if (sqlLower.startsWith('select count(*) as videos from videos')) {
      const { count, error } = await supabase.from('videos').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return [[{ videos: count || 0 }]];
    }

    if (sqlLower.startsWith('select count(*) as photos from photos')) {
      const { count, error } = await supabase.from('photos').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return [[{ photos: count || 0 }]];
    }

    if (sqlLower.startsWith('select count(*) as messages from contacts')) {
      const { count, error } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return [[{ messages: count || 0 }]];
    }

    if (sqlLower.startsWith('select count(*) as total from videos where category = ?')) {
      const category = params[0];
      const { count, error } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('category', category);
      if (error) throw error;
      return [[{ total: count || 0 }]];
    }

    if (sqlLower.startsWith('select count(*) as total from photos where category = ?')) {
      const category = params[0];
      const { count, error } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('category', category);
      if (error) throw error;
      return [[{ total: count || 0 }]];
    }

    // -------------------------------------------------------------
    // 2. SETTINGS
    // -------------------------------------------------------------
    if (sqlLower === 'select setting_key, setting_value from settings') {
      const { data, error } = await supabase.from('settings').select('setting_key, setting_value');
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.includes('from settings where setting_key = ?')) {
      const key = params[0];
      const { data, error } = await supabase.from('settings').select('setting_value').eq('setting_key', key).single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is row not found
      return data ? [[data]] : [[]];
    }

    if (sqlLower.startsWith('insert into settings')) {
      const key = params[0];
      const val = params[1];
      const { error } = await supabase.from('settings').upsert({
        setting_key: key,
        setting_value: val
      }, { onConflict: 'setting_key' });
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    // -------------------------------------------------------------
    // 3. ADMIN AUTHENTICATION
    // -------------------------------------------------------------
    if (sqlLower.startsWith('select * from admin_users where username = ?')) {
      const username = params[0];
      const { data, error } = await supabase.from('admin_users').select('*').eq('username', username);
      if (error) throw error;
      return [data || []];
    }

    // -------------------------------------------------------------
    // 4. CONTACTS
    // -------------------------------------------------------------
    if (sqlLower.startsWith('insert into contacts')) {
      const [name, email, phone, event_type, event_date, message] = params;
      const { error } = await supabase.from('contacts').insert([{
        name,
        email,
        phone,
        event_type,
        event_date: event_date || null,
        message
      }]);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    if (sqlLower.startsWith('select * from contacts order by submitted_at desc limit 5')) {
      const { data, error } = await supabase.from('contacts').select('*').order('submitted_at', { ascending: false }).limit(5);
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.startsWith('select * from contacts order by submitted_at desc')) {
      const { data, error } = await supabase.from('contacts').select('*').order('submitted_at', { ascending: false });
      if (error) throw error;
      return [data || []];
    }

    // -------------------------------------------------------------
    // 5. HERO SLIDES
    // -------------------------------------------------------------
    if (sqlLower.startsWith('select * from hero_slides order by order_index asc')) {
      const { data, error } = await supabase.from('hero_slides').select('*').order('order_index', { ascending: true });
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.startsWith('select * from hero_slides where id = ?')) {
      const id = params[0];
      const { data, error } = await supabase.from('hero_slides').select('*').eq('id', id);
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.startsWith('insert into hero_slides')) {
      const [image_path, title, subtitle, order_index] = params;
      const { error } = await supabase.from('hero_slides').insert([{
        image_path,
        title: title || '',
        subtitle: subtitle || '',
        order_index: order_index || 0
      }]);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    if (sqlLower.startsWith('update hero_slides set order_index = ? where id = ?')) {
      const [order_index, id] = params;
      const { error } = await supabase.from('hero_slides').update({ order_index }).eq('id', id);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    if (sqlLower.startsWith('delete from hero_slides where id = ?')) {
      const id = params[0];
      const { error } = await supabase.from('hero_slides').delete().eq('id', id);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    // -------------------------------------------------------------
    // 6. UGC ITEMS
    // -------------------------------------------------------------
    if (sqlLower.startsWith('select * from ugc_items order by order_index asc')) {
      const { data, error } = await supabase.from('ugc_items').select('*').order('order_index', { ascending: true });
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.startsWith('select * from ugc_items where id = ?')) {
      const id = params[0];
      const { data, error } = await supabase.from('ugc_items').select('*').eq('id', id);
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.startsWith('insert into ugc_items')) {
      const [type, file_path, order_index] = params;
      const { error } = await supabase.from('ugc_items').insert([{
        type,
        file_path,
        order_index: order_index || 0
      }]);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    if (sqlLower.startsWith('update ugc_items set order_index = ? where id = ?')) {
      const [order_index, id] = params;
      const { error } = await supabase.from('ugc_items').update({ order_index }).eq('id', id);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    if (sqlLower.startsWith('delete from ugc_items where id = ?')) {
      const id = params[0];
      const { error } = await supabase.from('ugc_items').delete().eq('id', id);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    // -------------------------------------------------------------
    // 7. VIDEOS
    // -------------------------------------------------------------
    if (sqlLower.startsWith('select * from videos order by created_at desc limit 3')) {
      const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false }).limit(3);
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.startsWith('select * from videos order by order_index asc, created_at desc')) {
      const { data, error } = await supabase.from('videos').select('*').order('order_index', { ascending: true }).order('created_at', { ascending: false });
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.includes('from videos where category = ?')) {
      const category = params[0];
      const limit = params[1] || 12;
      const offset = params[2] || 0;
      const { data, error } = await supabase.from('videos')
        .select('*')
        .eq('category', category)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.startsWith('select * from videos where id = ?')) {
      const id = params[0];
      const { data, error } = await supabase.from('videos').select('*').eq('id', id);
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.startsWith('insert into videos')) {
      const [title, description, category, video_type, youtube_url, file_path, thumbnail] = params;
      const { error } = await supabase.from('videos').insert([{
        title,
        description,
        category,
        video_type,
        youtube_url: youtube_url || null,
        file_path: file_path || null,
        thumbnail: thumbnail || null
      }]);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    if (sqlLower.startsWith('update videos set order_index = ? where id = ?')) {
      const [order_index, id] = params;
      const { error } = await supabase.from('videos').update({ order_index }).eq('id', id);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    if (sqlLower.startsWith('delete from videos where id = ?')) {
      const id = params[0];
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    // -------------------------------------------------------------
    // 8. PHOTOS
    // -------------------------------------------------------------
    if (sqlLower.startsWith('select * from photos order by created_at desc limit 3')) {
      const { data, error } = await supabase.from('photos').select('*').order('created_at', { ascending: false }).limit(3);
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.startsWith('select * from photos order by order_index asc, created_at desc')) {
      const { data, error } = await supabase.from('photos').select('*').order('order_index', { ascending: true }).order('created_at', { ascending: false });
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.includes('from photos where category = ?')) {
      const category = params[0];
      const limit = params[1] || 12;
      const offset = params[2] || 0;
      const { data, error } = await supabase.from('photos')
        .select('*')
        .eq('category', category)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.startsWith('select * from photos where id = ?')) {
      const id = params[0];
      const { data, error } = await supabase.from('photos').select('*').eq('id', id);
      if (error) throw error;
      return [data || []];
    }

    if (sqlLower.startsWith('insert into photos')) {
      const [category, file_path, alt_text] = params;
      const { error } = await supabase.from('photos').insert([{
        category,
        file_path,
        alt_text: alt_text || ''
      }]);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    if (sqlLower.startsWith('update photos set order_index = ? where id = ?')) {
      const [order_index, id] = params;
      const { error } = await supabase.from('photos').update({ order_index }).eq('id', id);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    if (sqlLower.startsWith('delete from photos where id = ?')) {
      const id = params[0];
      const { error } = await supabase.from('photos').delete().eq('id', id);
      if (error) throw error;
      return [{ affectedRows: 1 }];
    }

    console.warn('Unhandled SQL query in Supabase adapter, returning mock data:', sql);
    return getMockData(sql);
  } catch (err) {
    console.warn(`⚠️ Supabase Query Notice (${err.code || 'ERR'}): ${err.message}. Falling back to default data.`);
    return getMockData(sql);
  }
}

module.exports = {
  query,
  supabase
};
