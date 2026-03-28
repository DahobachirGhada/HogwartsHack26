// katia's work 
import User from '../models/usermodel.js';
import DonateurBeneficiaire from '../models/donateur_beneficiairemodel.js';
import Role from '../models/rolemodel.js';
import Association from '../models/associationmodel.js';
import { sendEmail } from '../utils/sendEmail.js';
import Maire from '../models/mairemodel.js'

export const getPendingAssociations = async (req, res) => {
  try {
    const associations = await Association.findAllPending();

    return res.status(200).json({
      message: 'Liste des associations en attente.',
      count: associations.length,
      associations,
    });

  } catch (error) {
    console.error('Erreur getPendingAssociations:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const approveAssociation = async (req, res) => {
  try {
    const { id } = req.params;

    const association = await Association.findById(id);
    if (!association) {
      return res.status(404).json({ message: 'Association non trouvée.' });
    }
    if (association.is_approved) {
      return res.status(400).json({ message: 'Association déjà approuvée.' });
    }
    await Association.approve(id);

    await User.update(association.user_id, { is_verified: true });

    const user = await User.findById(association.user_id);
    await sendEmail({
      to: user.email,
      subject: 'Votre association a été approuvée — ZeroWaste',
      html: `
        <h2>Félicitations !</h2>
        <p>Bonjour <strong>${association.nom_association}</strong>,</p>
        <p>Votre association a été <strong>validée</strong> par l'administrateur ZeroWaste.</p>
        <p>Vous pouvez maintenant vous connecter à votre compte.</p>
        <p style="color: #002060; font-weight: bold;">Compte créé — Vous pouvez vous connecter !</p>
      `,
    });

    return res.status(200).json({
      message: 'Association approuvée avec succès.',
    });

  } catch (error) {
    console.error('Erreur approveAssociation:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const rejectAssociation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const association = await Association.findById(id);
    if (!association) {
      return res.status(404).json({ message: 'Association non trouvée.' });
    }

    await User.update(association.user_id, { is_active: false });

    const user = await User.findById(association.user_id);
    await sendEmail({
      to: user.email,
      subject: ' Demande d\'association refusée — ZeroWaste',
      html: `
        <h2>Demande refusée</h2>
        <p>Bonjour <strong>${association.nom_association}</strong>,</p>
        <p>Votre demande d'inscription a été <strong>refusée</strong> par l'administrateur.</p>
        ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
        <p>Pour plus d'informations, contactez-nous.</p>
      `,
    });

    return res.status(200).json({
      message: 'Association refusée.',
    });

  } catch (error) {
    console.error('Erreur rejectAssociation:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};
//liliana's work 
export const activateAccount = async(req,res)=>{
  try{

  const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    if (user.is_active) {
      return res.status(400).json({ message: 'compte utilisateur déjà activé.' });
    }

    await User.update(user.id, { is_active: true, is_verified: true });
    await sendEmail({
      to: user.email,
      subject: 'Votre compte est activé — ZeroWaste',
      html: `
        <h2>Félicitations !</h2>
        <p>Bonjour <strong>${user.name}</strong>,</p>
        <p>Votre compte est bien <strong>Activé</strong> par l'administrateur ZeroWaste.</p>
        <p>Vous pouvez maintenant vous connecter à votre compte.</p>
        <p style="color: #002060; font-weight: bold;">Compte créé — Vous pouvez vous connecter !</p>
      `,
    });

    return res.status(200).json({
      message: 'Compte utilisateur Activé avec succès.',
    });


  }catch(error){console.error('Erreur activateAccount:',error);
    return res.status(500).json({message:'Erreur Serveur'});
  }
};


export const deactivateAccount = async(req,res)=>{
  try{

    
  const { id } = req.params;
   const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    if (!user.is_active) {
      return res.status(400).json({ message: 'compte utilisateur déjà déactivé.' });
    }
await User.update(user.id, { is_active: false, is_verified: true });
    await sendEmail({
      to: user.email,
      subject: 'Votre compte est déctivé — ZeroWaste',
      html: `
       <h2>Compte déactivé!</h2>
        <p>Bonjour <strong>${user.name}</strong>,</p>
        <p>Votre compte a été <strong>déactivé</strong> par l'administrateur.</p>
        ${reason ? `<p><strong>Raison :</strong> ${reason}</p>` : ''}
        <p>Pour plus d'informations, contactez-nous.</p>
      
        <p style="color: #002060; font-weight: bold;">Compte créé — Vous pouvez vous connecter !</p>
      `,
    });

    return res.status(200).json({
      message: 'Compte utilisateur Déactivé avec succès.',
    });



  }catch(error){console.error('Erreur deactivateAccount:',error);
    return res.status(500).json({message:'Erreur Serveur'});
  }
};

export const updateUserProfile = async(req,res)=>{
  try{
    console.log(" [DEBUG] updateUserProfile a été appelé !"); 
    console.log(" ID reçu :", req.params.id); 
    const {id} = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({message:"l'utilisateur n'existe pas!"});
    }
await User.update(id,{
  name:req.body.name||user.name,
  email:req.body.email||user.email,
  phone:req.body.phone||user.phone,
  wilaya:req.body.wilaya||user.wilaya,
});
    
    const role = await Role.getUserRoles(id);
    const roleName = role[0]?.role_name;
    
    
    console.log(" [DEBUG] Valeur brute de roleName :", roleName);
    console.log(" [DEBUG] Type de roleName :", typeof roleName);

    if (roleName === "chef_ass" || roleName === "association" || (Array.isArray(roleName) && roleName.includes("association"))) {
      console.log(" Entrée dans le bloc Association");
      const existingAssociation = await Association.findByUserId(id);
       let zonesValue = req.body.zones_intervention || existingAssociation?.zones_intervention;
if (zonesValue) {
    if (typeof zonesValue === 'string') {
      try {
        const parsed = JSON.parse(zonesValue);
        zonesValue = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        zonesValue = [zonesValue.trim()];
      }
    } else if (!Array.isArray(zonesValue)) {
      zonesValue = [zonesValue];
    }
    zonesValue = JSON.stringify(zonesValue);
  };
  let horairy=req.body.horaires || existingAssociation?.horaires;
  if (horairy) {
    if (typeof horairy === 'string') {
      try {
        const parsed = JSON.parse(horairy);
        horairy = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        horairy = [horairy.trim()];
      }
    } else if (!Array.isArray(horairy)) {
      horairy = [horairy];
    }
    horairy = JSON.stringify(horairy);
  }





    const result = await Association.update(id, {
        adresse: req.body.adresse || existingAssociation?.adresse,
        nom_association: req.body.nom_association || existingAssociation?.nom_association,
        zones_intervention: zonesValue,
        capacite: req.body.capacite || existingAssociation?.capacite,
        horaires:horairy
      

      });
      console.log(" Résultat update Association :", result);
      
    } else {
      console.log(" Condition NON remplie. roleName ne match pas 'association'");
    }
   if (roleName === "user") {

const existingDonnator = await DonateurBeneficiaire.findByUserId(id);
    let dietary = req.body.dietary_restrictions || existingDonnator?.dietary_restrictions;

if (dietary) {

  if (typeof dietary === "string") {

    // Corriger les quotes simples en JSON valide
    dietary = dietary.replace(/'/g, '"');

    try {
      const parsed = JSON.parse(dietary);
      dietary = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      dietary = [dietary.trim()];
    }

  }

  if (!Array.isArray(dietary)) {
    dietary = [dietary];
  }

  dietary = JSON.stringify(dietary);
}let aller = req.body.allergies ?? existingDonnator?.allergies;

if (aller !== undefined && aller !== null) {

  if (typeof aller === "string") {

    aller = aller.replace(/'/g,'"');

    try {
      const parsed = JSON.parse(aller);
      aller = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      aller = [aller.trim()];
    }

  }

  if (!Array.isArray(aller)) {
    aller = [aller];
  }

  aller = JSON.stringify(aller);
}





      await DonateurBeneficiaire.update(id, {
        adresse: req.body.adresse||existingDonnator?.adresse,
        search_distance: req.body.search_distance||existingDonnator?.search_distance,
        allergies: aller,
        dietary_restrictions: dietary,
        birth_date: req.body.birth_date|| existingDonnator?.birth_date

      });

    }

     if (roleName === "maire") {
      const existingMaire = await Maire.findByUserId(id);

      await Maire.update(id, {
        commune: req.body.commune||existingMaire?.commune,
        code_commune: req.body.code_commune||existingMaire?.code_commune,
      });

    }
 return res.status(200).json({
      message: "Profil utilisateur mis à jour avec succès."
    });


  }catch(error){console.error('Erreur updateUserProfile:',error);
    return res.status(500).json({message:'Erreur Serveur'});
  }
};


export const deleteAccount = async(req,res)=>{
  try{
const {id}= req.params;
const user = await User.findById(id);
if (!user){return res.status(404).json({message:"l'utilisateur n'existe pas"})};
  const role = await Role.getUserRoles(id);
    const roleName = role[0]?.role_name;

 if (roleName === "association" || roleName === "chef_ass") {
      await Association.delete(id);
    }

    if (roleName === "user") {
      await DonateurBeneficiaire.delete(id);
    }

    if (roleName === "maire") {
      await Maire.delete(id);
    }
await User.delete(id);
  

    return res.status(200).json({
      message: "Compte utilisateur supprimé avec succès."
    });



  }catch(error){console.error('Erreur deleteAccount:',error);
    return res.status(500).json({message:'Erreur Serveur'});
  }
};


export const getAllusers = async(req,res)=>{
  try{
       const user = await User.getUsersList();

    return res.status(200).json({
      message: 'Liste des utilisateurs en attente.',
      count: user.length,
      user,
    });

  }catch(error){console.error('Erreur getUsersList:',error);
    return res.status(500).json({message:'Erreur Serveur'});
  }
};

export const getUserProfile = async(req,res)=>{
  try{
    const id = req.params.id;
    console.log("getUserProfile appelé pour ID :", id);
    
    const user = await User.findById(id);
    if (!user){
      return res.status(404).json({message:"l'utilisateur n'existe pas"});
    }
    
    const role = await Role.getUserRoles(id);
    const roleName = role[0]?.role_name;
    console.log(" Rôle détecté :", roleName);
    
    let profile = {
      ...user,
      role: roleName,
    }

    
    if (roleName === "association" || roleName === "chef_ass") {
      console.log(" Entrée dans le bloc Association");
      
      const association = await Association.findByUserId(id);
      console.log(" Résultat findByUserId :", association);
      
      if (association) {
        profile.association = association;
        console.log(" Association ajoutée au profil");
      } else {
        console.warn(" Aucune association trouvée en BDD pour user_id =", id);
      }
    }

    if (roleName === "user") {
      const donor = await DonateurBeneficiaire.findByUserId(user.id);
      profile.donateur_beneficiaire = donor;
    }

    if (roleName === "maire") {
      const maire = await Maire.findByUserId(user.id);
      profile.maire = maire;
    }

    return res.status(200).json({
      success: true,
      user: profile
    });

  } catch(error) {
    console.error(' Erreur getUserProfile:', error);
    return res.status(500).json({message:'Erreur Serveur'});
  }
};